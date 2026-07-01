import pandas as pd
import numpy as np
import scipy.sparse as sparse
import implicit
from pymongo import MongoClient
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
from pathlib import Path
from dotenv import load_dotenv
from bson import ObjectId
import traceback


# Setup
models_dir = Path(__file__).parent / 'models'
models_dir.mkdir(parents=True, exist_ok=True)

# get env variables
load_dotenv(dotenv_path=Path(__file__).parent / '.env', override=True)

# get mongo db connection info from env vars.
MONGO_URI = os.getenv('MONGO_URI') or os.getenv(
    'MONGODB_URI') or 'mongodb://localhost:27017/'
DB_NAME = os.getenv('MONGO_DB_NAME') or os.getenv('MONGODB_DB') or 'TravexDB'

ACTIVE_PACKAGE_FILTER = {
    'isArchived': {'$ne': True},
    'archived': {'$ne': True},
    'status': {'$nin': ['Archived', 'archived']}
}


def _user_id_filter(user_id):
    user_id = str(user_id)
    values = [user_id]

    if ObjectId.is_valid(user_id):
        values.append(ObjectId(user_id))

    return {
        '$in': values
    }

# utility functions - convert to clean strings


def _as_text_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, tuple):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    return [text] if text else []


# combination of package fields
def _build_package_text(row):
    parts = [
        row.get('packageName', ''),
        row.get('packageDescription', ''),
        row.get('packageType', ''),
        ' '.join(_as_text_list(row.get('packageTags'))),
    ]
    return ' '.join(part for part in parts if str(part).strip())


# converts user preferences into a search query
def _build_user_query_text(pref_row):
    parts = [
        ' '.join(_as_text_list(pref_row.get('moods'))),
        ' '.join(_as_text_list(pref_row.get('tours'))),
        ' '.join(_as_text_list(pref_row.get('pace'))),
    ]
    return ' '.join(part for part in parts if part).strip()


# if column of is empty or missing, fallback
def _series_or_empty(df, column, dtype=object):
    if column in df.columns:
        return df[column]
    return pd.Series([None] * len(df), index=df.index, dtype=dtype)

# get data from MongoDB


def get_data_from_mongodb():
    """Fetch packages, user preferences, and ratings from MongoDB."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        raise

    db = client[DB_NAME]

    packages_data = list(db['packages'].find(
        ACTIVE_PACKAGE_FILTER,
        {
            'packageName': 1,
            'packageCode': 1,
            'packageDescription': 1,
            'packageType': 1,
            'packageTags': 1,
            'images': 1,
            'isArchived': 1,
            'archived': 1,
            'status': 1,
        }
    ))

    packages_df = pd.DataFrame(packages_data) if packages_data else pd.DataFrame(
        columns=['_id', 'packageName', 'packageCode',
                 'packageDescription', 'packageType', 'packageTags', 'images']
    )

    print(f"[MongoDB] Loaded {len(packages_df)} packages")

    preferences_data = list(
        db['preferrences'].find({}, {
            'userId': 1,
            'moods': 1,
            'tours': 1,
            'pace': 1
        })
    )

    preferences_df = pd.DataFrame(preferences_data) if preferences_data else pd.DataFrame(
        columns=['_id', 'userId', 'moods', 'tours', 'pace']
    )
    print(f"[MongoDB] Loaded {len(preferences_df)} preferrences")

    ratings_data = list(db['ratings'].find({}, {
        'packageId': 1,
        'userId': 1,
        'rating': 1,
        'review': 1,
        'createdAt': 1,
    }))

    ratings_df = pd.DataFrame(ratings_data) if ratings_data else pd.DataFrame(
        columns=['_id', 'packageId', 'userId', 'rating', 'review', 'createdAt']
    )
    print(f"[MongoDB] Loaded {len(ratings_df)} ratings")

    client.close()
    return packages_df, preferences_df, ratings_df


def get_user_preferences_from_mongodb(user_id):
    """Fetch the latest preferences for a single user so recommendations can react without retraining."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[DB_NAME]

        preferences_data = list(
            db['preferrences'].find({
                'userId': _user_id_filter(user_id)
            }, {
                'userId': 1,
                'moods': 1,
                'tours': 1,
                'pace': 1,
            })
        )

        client.close()

        if not preferences_data:
            return pd.DataFrame(columns=['userId', 'moods', 'tours', 'pace'])

        df = pd.DataFrame(preferences_data)
        df['userId'] = _series_or_empty(df, 'userId', dtype=str).astype(str)
        df['moods'] = _series_or_empty(df, 'moods').apply(_as_text_list)
        df['tours'] = _series_or_empty(df, 'tours').apply(_as_text_list)
        df['pace'] = _series_or_empty(df, 'pace').apply(_as_text_list)
        return df
    except Exception as e:
        print(
            f"[Preferences] Could not load live preferences for user {user_id}: {e}")
        return pd.DataFrame(columns=['userId', 'moods', 'tours', 'pace'])


def get_user_ratings_from_mongodb(user_id):
    """Fetch the latest ratings for a single user so collaborative filtering works immediately."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[DB_NAME]

        ratings_data = list(
            db['ratings'].find({
                'userId': _user_id_filter(user_id)
            }, {
                'packageId': 1,
                'userId': 1,
                'rating': 1,
                'review': 1,
                'createdAt': 1
            })
        )
        client.close()

        if not ratings_data:
            return pd.DataFrame(columns=['packageId', 'userId', 'rating'])

        df = pd.DataFrame(ratings_data)
        df['userId'] = _series_or_empty(df, 'userId', dtype=str).astype(str)
        df['packageId'] = _series_or_empty(
            df, 'packageId', dtype=str).astype(str)
        return df
    except Exception as e:
        print(f"[Ratings] Could not load live ratings for user {user_id}: {e}")
        return pd.DataFrame(columns=['packageId', 'userId', 'rating'])


# training the model, fetch data and train
def run_training_cycle():
    """Fetch data from MongoDB and train models."""
    try:
        print("[Training] Starting training cycle...")
        packages_df, preferences_df, ratings_df = get_data_from_mongodb()

        if packages_df.empty:
            print("[Training]  No packages found in MongoDB.")
            return False

        train_and_save_models(packages_df, preferences_df, ratings_df)
        print("[Training]  Models updated with latest DB data.")
        return True
    except Exception as e:
        print(f"[Training]  Error during training: {e}")
        return False


def get_active_package_ids_from_mongodb():
    """
    Fetch the IDs of packages that are currently active.

    This prevents stale model metadata from recommending a package
    that was archived after the model was trained.
    """
    client = None

    try:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000
        )

        client.admin.command('ping')
        db = client[DB_NAME]

        active_packages = db['packages'].find(
            ACTIVE_PACKAGE_FILTER,
            {'_id': 1}
        )

        return {
            str(package['_id'])
            for package in active_packages
            if package.get('_id') is not None
        }

    except Exception as error:
        print(
            '[Packages] Could not load active package IDs: '
            f'{error}'
        )

        # None means the database check failed.
        # Do not remove all recommendations because of a temporary DB error.
        return None

    finally:
        if client is not None:
            client.close()


def train_and_save_models(packages_df, preferences_df, ratings_df):
    """Train content-based and collaborative recommendation models from real collections."""
    try:
        packages_df = packages_df.copy()
        preferences_df = preferences_df.copy()
        ratings_df = ratings_df.copy()

        if '_id' in packages_df.columns:
            packages_df['packageId'] = packages_df['_id'].astype(str)
        else:
            packages_df['packageId'] = packages_df.index.astype(str)

        packages_df['packageName'] = _series_or_empty(
            packages_df, 'packageName', dtype=str).fillna('').astype(str)
        packages_df['packageDescription'] = _series_or_empty(
            packages_df, 'packageDescription', dtype=str).fillna('').astype(str)
        packages_df['packageType'] = _series_or_empty(
            packages_df, 'packageType', dtype=str).fillna('').astype(str)
        packages_df['packageTags'] = _series_or_empty(
            packages_df, 'packageTags').apply(_as_text_list)
        packages_df['package_text'] = packages_df.apply(
            _build_package_text, axis=1)

        print("[Training] Training Content-Based model from package tags...")
        tfidf = TfidfVectorizer(stop_words='english', max_features=500)
        tfidf_matrix = tfidf.fit_transform(
            packages_df['package_text'].fillna(''))

        preferences_df['userId'] = _series_or_empty(
            preferences_df, 'userId', dtype=str).astype(str)
        preferences_df['moods'] = _series_or_empty(
            preferences_df, 'moods').apply(_as_text_list)
        preferences_df['tours'] = _series_or_empty(
            preferences_df, 'tours').apply(_as_text_list)
        preferences_df['pace'] = _series_or_empty(
            preferences_df, 'pace').apply(_as_text_list)
        preferences_df['preference_text'] = preferences_df.apply(
            _build_user_query_text, axis=1)

        ratings_df['userId'] = _series_or_empty(
            ratings_df, 'userId', dtype=str).astype(str)
        ratings_df['packageId'] = _series_or_empty(
            ratings_df, 'packageId', dtype=str).astype(str)
        ratings_df['rating'] = pd.to_numeric(_series_or_empty(
            ratings_df, 'rating', dtype=float), errors='coerce').fillna(0).astype(float)
        ratings_df = ratings_df[(ratings_df['packageId'].isin(
            packages_df['packageId'])) & (ratings_df['rating'] > 0)]

        package_ids = packages_df['packageId'].tolist()
        package_id_to_index = {package_id: idx for idx,
                               package_id in enumerate(package_ids)}
        index_to_package_id = {
            idx: package_id for package_id, idx in package_id_to_index.items()}

        user_ids = sorted(
            ratings_df['userId']
            .dropna()
            .astype(str)
            .unique()
        )

        user_id_to_index = {user_id: idx for idx,
                            user_id in enumerate(user_ids)}
        index_to_user_id = {idx: user_id for user_id,
                            idx in user_id_to_index.items()}

        user_item_matrix = sparse.csr_matrix(
            (
                ratings_df['rating'].astype(float),
                (
                    ratings_df['userId'].map(user_id_to_index).astype(int),
                    ratings_df['packageId'].map(
                        package_id_to_index).astype(int),
                ),
            ),
            shape=(len(user_id_to_index), len(package_id_to_index))
        )

        rating_user_count = ratings_df['userId'].nunique()
        rated_package_count = ratings_df['packageId'].nunique()

        if (
            ratings_df.empty
            or rating_user_count < 2
            or rated_package_count < 2
        ):
            model = None

            print(
                "[Training] Not enough collaborative rating data. "
                f"Users with ratings: {rating_user_count}, "
                f"packages with ratings: {rated_package_count}"
            )
        else:
            print(
                "[Training] Training Collaborative Filtering "
                "model from ratings..."
            )

            model = implicit.als.AlternatingLeastSquares(
                factors=20,
                iterations=20,
                regularization=0.05,
                random_state=42
            )

            # Rows are users and columns are packages.
            model.fit(
                user_item_matrix.tocsr() * 15
            )

        print("[Training] Saving models...")
        # Ensure models directory exists (handle case where it was removed at runtime)
        models_path = models_dir
        models_path.mkdir(parents=True, exist_ok=True)

        # Save ALS model only when trained; remove stale file if present when not training
        als_path = models_path / 'als_model.pkl'
        if model is not None:
            joblib.dump(model, str(als_path))
        else:
            try:
                if als_path.exists():
                    als_path.unlink()
            except FileNotFoundError:
                pass
            except Exception:
                print(
                    f"[Training] Could not remove stale ALS file: {als_path}")

        joblib.dump(tfidf_matrix, str(models_path / 'tfidf_matrix.pkl'))
        joblib.dump(tfidf, str(models_path / 'tfidf_vectorizer.pkl'))
        joblib.dump(user_item_matrix, str(
            models_path / 'user_item_matrix.pkl'))
        joblib.dump({
            'packages_df': packages_df,
            'preferences_df': preferences_df,
            'ratings_df': ratings_df,
            'package_id_to_index': package_id_to_index,
            'index_to_package_id': index_to_package_id,
            'user_id_to_index': user_id_to_index,
            'index_to_user_id': index_to_user_id,
            'package_text_column': 'package_text',
        }, str(models_path / 'metadata.pkl'))
        print("[Training]  All models saved successfully")
    except Exception as e:
        print(f"[Training]  Error saving models: {e}")
        traceback.print_exc()
        raise


def models_exist():
    """Check if the recommendation artifacts exist."""
    return (models_dir / 'tfidf_matrix.pkl').exists() and (models_dir / 'tfidf_vectorizer.pkl').exists() and (models_dir / 'metadata.pkl').exists()


def _recommend_content_based(packages_df, tfidf_matrix, vectorizer, query_text, num_recommendations, exclude_ids=None):
    exclude_ids = set(exclude_ids or [])
    if packages_df.empty:
        return []

    scored_rows = []
    similarities = None
    if query_text.strip():
        query_vec = vectorizer.transform([query_text])
        similarities = cosine_similarity(query_vec, tfidf_matrix)[0]

    for idx, row in packages_df.iterrows():
        package_id = row['packageId']
        if package_id in exclude_ids:
            continue

        score = 0.0
        if similarities is not None:
            score = float(similarities[idx])

        scored_rows.append({
            'packageId': package_id,
            'packageName': row.get('packageName', ''),
            'score': score,
        })

    scored_rows.sort(key=lambda item: item['score'], reverse=True)

    if len(scored_rows) < num_recommendations:
        existing_ids = {item['packageId'] for item in scored_rows}
        for _, row in packages_df.iterrows():
            package_id = row['packageId']
            if package_id in existing_ids:
                continue
            scored_rows.append({
                'packageId': package_id,
                'packageName': row.get('packageName', ''),
                'score': 0.0,
            })
            if len(scored_rows) >= num_recommendations:
                break

    return scored_rows[:num_recommendations]


def _build_live_user_item_row(
    user_ratings,
    package_id_to_index,
    package_count
):

    column_indices = []
    confidence_values = []

    if user_ratings.empty:
        return sparse.csr_matrix(
            (1, package_count),
            dtype=np.float32
        )

    for _, rating_row in user_ratings.iterrows():
        package_id = str(
            rating_row.get('packageId', '')
        )

        package_index = package_id_to_index.get(
            package_id
        )

        if package_index is None:
            continue

        try:
            rating_value = float(
                rating_row.get('rating', 0)
            )
        except (TypeError, ValueError):
            rating_value = 0

        if rating_value <= 0:
            continue

        column_indices.append(package_index)

        # Must use a similar confidence scale to model training.
        confidence_values.append(
            rating_value * 15.0
        )

    if not column_indices:
        return sparse.csr_matrix(
            (1, package_count),
            dtype=np.float32
        )

    row_indices = [0] * len(column_indices)

    return sparse.csr_matrix(
        (
            confidence_values,
            (
                row_indices,
                column_indices
            )
        ),
        shape=(1, package_count),
        dtype=np.float32
    )


def get_hybrid_recs(user_id, last_tour_name=None, num_recommendations=5):
    try:
        num_recommendations = max(
            3,
            int(num_recommendations or 3)
        )

        if not models_exist():
            return {
                'error': 'Models not trained yet',
                'recommendations': []
            }

        tfidf_matrix = joblib.load(
            models_dir / 'tfidf_matrix.pkl'
        )

        vectorizer = joblib.load(
            models_dir / 'tfidf_vectorizer.pkl'
        )

        meta = joblib.load(
            models_dir / 'metadata.pkl'
        )

        model = (
            joblib.load(models_dir / 'als_model.pkl')
            if (models_dir / 'als_model.pkl').exists()
            else None
        )

        packages_df = meta.get(
            'packages_df',
            pd.DataFrame()
        ).copy()

        preferences_df = meta.get(
            'preferences_df',
            pd.DataFrame()
        ).copy()

        package_id_to_index = meta.get(
            'package_id_to_index',
            {}
        )

        index_to_package_id = meta.get(
            'index_to_package_id',
            {}
        )

        if packages_df.empty:
            return {
                'error': 'No packages available',
                'recommendations': []
            }

        packages_df['packageId'] = _series_or_empty(
            packages_df,
            'packageId',
            dtype=str
        ).astype(str)

        active_package_ids = get_active_package_ids_from_mongodb()
        if active_package_ids is not None:
            packages_df = packages_df[
                packages_df['packageId'].isin(active_package_ids)
            ].copy()

            print(
                f"[Recommendations] {len(packages_df)} active "
                "packages are available"
            )

        if packages_df.empty:
            return {
                'error': 'No active packages available',
                'recommendations': []
            }

        user_id = str(user_id)

        # Always get the user's newest ratings from MongoDB.
        user_ratings = get_user_ratings_from_mongodb(
            user_id
        )

        if not user_ratings.empty:
            user_ratings['packageId'] = _series_or_empty(
                user_ratings,
                'packageId',
                dtype=str
            ).astype(str)

            user_ratings['rating'] = pd.to_numeric(
                _series_or_empty(
                    user_ratings,
                    'rating',
                    dtype=float
                ),
                errors='coerce'
            ).fillna(0).astype(float)

            user_ratings = user_ratings[
                user_ratings['rating'] > 0
            ]

        rated_package_ids = set(
            _series_or_empty(
                user_ratings,
                'packageId',
                dtype=str
            ).astype(str).tolist()
        )

        print(
            f"[Recommendations] User {user_id} has "
            f"{len(rated_package_ids)} rated packages"
        )

        # ========================================================
        # HAS RATINGS: COLLABORATIVE FILTERING
        # ========================================================
        if rated_package_ids:
            if model is not None and package_id_to_index:
                live_user_row = _build_live_user_item_row(
                    user_ratings=user_ratings,
                    package_id_to_index=package_id_to_index,
                    package_count=len(package_id_to_index)
                )

                if live_user_row.nnz > 0:
                    try:
                        candidate_count = min(
                            len(package_id_to_index),
                            max(
                                num_recommendations * 5,
                                20
                            )
                        )

                        # userid=0 is only a placeholder here.
                        #
                        # recalculate_user=True means ALS calculates a
                        # new user factor from live_user_row instead of
                        # using model.user_factors[0].
                        recommended_indices, scores = (
                            model.recommend(
                                userid=0,
                                user_items=live_user_row,
                                N=candidate_count,
                                filter_already_liked_items=True,
                                recalculate_user=True
                            )
                        )

                        recommendations = []

                        for item_index, score in zip(
                            recommended_indices,
                            scores
                        ):
                            package_id = (
                                index_to_package_id.get(
                                    int(item_index)
                                )
                            )

                            if not package_id:
                                continue

                            package_id = str(package_id)

                            if package_id in rated_package_ids:
                                continue

                            package_match = packages_df[
                                packages_df['packageId']
                                == package_id
                            ]

                            if package_match.empty:
                                continue

                            package_row = package_match.iloc[0]

                            recommendations.append({
                                'packageId': package_id,
                                'packageName': package_row.get(
                                    'packageName',
                                    ''
                                ),
                                'score': float(score)
                            })

                            if (
                                len(recommendations)
                                >= num_recommendations
                            ):
                                break

                        if recommendations:
                            print(
                                f"[Recommendations] Returning "
                                f"{len(recommendations)} "
                                f"collaborative recommendations"
                            )

                            return {
                                'user_id': user_id,
                                'method': 'collaborative',
                                'rated_package_ids': list(
                                    rated_package_ids
                                ),
                                'recommendations': recommendations
                            }

                        print(
                            '[Recommendations] ALS returned no '
                            'usable packages'
                        )

                    except Exception as collaborative_error:
                        print(
                            '[Recommendations] Collaborative '
                            f'filtering failed: '
                            f'{collaborative_error}'
                        )

                        traceback.print_exc()

            else:
                print(
                    '[Recommendations] ALS model is unavailable. '
                    'Using reviewed-package similarity fallback.'
                )

            # ====================================================
            # COLLABORATIVE FALLBACK
            #
            # This is only used when there are not enough community
            # ratings to train ALS or ALS returns no candidates.
            # It does not revert to user preferences.
            # ====================================================
            reviewed_package_texts = []

            for _, rating_row in user_ratings.iterrows():
                package_id = str(
                    rating_row.get('packageId', '')
                )

                rating_value = float(
                    rating_row.get('rating', 0)
                )

                package_match = packages_df[
                    packages_df['packageId']
                    == package_id
                ]

                if package_match.empty:
                    continue

                package_text = str(
                    package_match.iloc[0].get(
                        'package_text',
                        ''
                    )
                ).strip()

                if not package_text:
                    continue

                # Higher ratings have more influence.
                if rating_value >= 5:
                    weight = 3
                elif rating_value >= 4:
                    weight = 2
                else:
                    weight = 1

                reviewed_package_texts.extend(
                    [package_text] * weight
                )

            review_query = ' '.join(
                reviewed_package_texts
            ).strip()

            fallback_recommendations = (
                _recommend_content_based(
                    packages_df=packages_df,
                    tfidf_matrix=tfidf_matrix,
                    vectorizer=vectorizer,
                    query_text=review_query,
                    num_recommendations=num_recommendations,
                    exclude_ids=rated_package_ids
                )
            )

            return {
                'user_id': user_id,
                'method': 'review-content-fallback',
                'rated_package_ids': list(
                    rated_package_ids
                ),
                'recommendations': fallback_recommendations
            }

        # ========================================================
        # NO RATINGS: PREFERENCE-BASED CONTENT FILTERING
        # ========================================================
        live_preferences = (
            get_user_preferences_from_mongodb(user_id)
        )

        if not live_preferences.empty:
            user_preferences = live_preferences
        else:
            trained_preference_user_ids = _series_or_empty(
                preferences_df,
                'userId',
                dtype=str
            ).astype(str)

            user_preferences = preferences_df[
                trained_preference_user_ids == user_id
            ]

        query_parts = []

        if not user_preferences.empty:
            preference_row = user_preferences.iloc[0]

            preference_text = _build_user_query_text(
                preference_row
            )

            if preference_text:
                query_parts.append(
                    preference_text
                )

        if last_tour_name:
            query_parts.append(
                str(last_tour_name)
            )

        preference_query = ' '.join(
            query_parts
        ).strip()

        recommendations = _recommend_content_based(
            packages_df=packages_df,
            tfidf_matrix=tfidf_matrix,
            vectorizer=vectorizer,
            query_text=preference_query,
            num_recommendations=num_recommendations,
            exclude_ids=set()
        )

        return {
            'user_id': user_id,
            'method': 'content-based',
            'recommendations': recommendations
        }

    except Exception as error:
        print(
            f"[Recommendations] Error for user "
            f"{user_id}: {error}"
        )

        traceback.print_exc()

        return {
            'error': str(error),
            'recommendations': []
        }
