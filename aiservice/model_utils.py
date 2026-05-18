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
import traceback

# Create models directory relative to this file (service-local)
models_dir = Path(__file__).parent / 'models'
models_dir.mkdir(parents=True, exist_ok=True)

# Load .env from the service folder (if present)
# Override existing environment values so the deployed service uses the service-local config.
load_dotenv(dotenv_path=Path(__file__).parent / '.env', override=True)

# Get MongoDB URI from environment or use default
MONGO_URI = os.getenv('MONGO_URI') or os.getenv(
    'MONGODB_URI') or 'mongodb://localhost:27017/'
DB_NAME = os.getenv('MONGO_DB_NAME') or os.getenv('MONGODB_DB') or 'TravexDB'


def _as_text_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, tuple):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    return [text] if text else []


def _build_package_text(row):
    parts = [
        row.get('packageName', ''),
        row.get('packageDescription', ''),
        row.get('packageType', ''),
        ' '.join(_as_text_list(row.get('packageTags'))),
    ]
    return ' '.join(part for part in parts if str(part).strip())


def _build_user_query_text(pref_row):
    parts = [
        ' '.join(_as_text_list(pref_row.get('moods'))),
        ' '.join(_as_text_list(pref_row.get('tours'))),
        ' '.join(_as_text_list(pref_row.get('pace'))),
    ]
    return ' '.join(part for part in parts if part).strip()


def _series_or_empty(df, column, dtype=object):
    if column in df.columns:
        return df[column]
    return pd.Series([None] * len(df), index=df.index, dtype=dtype)


def get_data_from_mongodb():
    """Fetch packages, user preferences, and ratings from MongoDB."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        raise

    db = client[DB_NAME]

    packages_data = list(db['packages'].find({}, {
        'packageName': 1,
        'packageCode': 1,
        'packageDescription': 1,
        'packageType': 1,
        'packageTags': 1,
        'images': 1,
    }))
    packages_df = pd.DataFrame(packages_data) if packages_data else pd.DataFrame(
        columns=['_id', 'packageName', 'packageCode',
                 'packageDescription', 'packageType', 'packageTags', 'images']
    )
    print(f"[MongoDB] Loaded {len(packages_df)} packages")

    preferences_data = list(db['preferrences'].find({}, {
        'userId': 1,
        'moods': 1,
        'tours': 1,
        'pace': 1,
    }))
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

        preferences_data = list(db['preferrences'].find({'userId': str(user_id)}, {
            'userId': 1,
            'moods': 1,
            'tours': 1,
            'pace': 1,
        }))
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

        ratings_data = list(db['ratings'].find({'userId': str(user_id)}, {
            'packageId': 1,
            'userId': 1,
            'rating': 1,
        }))
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

        user_ids = sorted(set(preferences_df['userId'].dropna().astype(
            str)).union(set(ratings_df['userId'].dropna().astype(str))))
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

        if ratings_df.empty or len(user_id_to_index) < 2 or len(package_id_to_index) < 2:
            model = None
            print(
                "[Training] ⚠ Not enough ratings to train ALS yet; saving content-based model only.")
        else:
            print("[Training] Training Collaborative Filtering model from ratings...")
            model = implicit.als.AlternatingLeastSquares(
                factors=20, iterations=20, regularization=0.05, random_state=42)
            # implicit expects an (items x users) matrix for training
            model.fit((user_item_matrix.T).tocsr() * 15)

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
                    f"[Training] ⚠ Could not remove stale ALS file: {als_path}")

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


def get_hybrid_recs(user_id, last_tour_name=None, num_recommendations=5):
    """Get package recommendations using ratings-based ALS plus preference-based fallback."""
    try:
        num_recommendations = max(3, int(num_recommendations or 3))

        if not models_exist():
            return {"error": "Models not trained yet", "recommendations": []}

        tfidf_matrix = joblib.load(models_dir / 'tfidf_matrix.pkl')
        vectorizer = joblib.load(models_dir / 'tfidf_vectorizer.pkl')
        meta = joblib.load(models_dir / 'metadata.pkl')
        model = joblib.load(
            models_dir / 'als_model.pkl') if (models_dir / 'als_model.pkl').exists() else None
        user_item_matrix = joblib.load(models_dir / 'user_item_matrix.pkl') if (
            models_dir / 'user_item_matrix.pkl').exists() else None

        packages_df = meta.get('packages_df', pd.DataFrame())
        preferences_df = meta.get('preferences_df', pd.DataFrame())
        ratings_df = meta.get('ratings_df', pd.DataFrame())
        user_id_to_index = meta.get('user_id_to_index', {})
        index_to_package_id = meta.get('index_to_package_id', {})

        user_id = str(user_id)
        user_preferences_live = get_user_preferences_from_mongodb(user_id)
        if not user_preferences_live.empty:
            user_preferences = user_preferences_live
        else:
            user_preferences = preferences_df[_series_or_empty(
                preferences_df, 'userId', dtype=str).astype(str) == user_id]

        # Fetch live ratings from MongoDB instead of using stale training data
        user_ratings = get_user_ratings_from_mongodb(user_id)
        if user_ratings.empty:
            # Fallback to training data if no live ratings found
            user_ratings = ratings_df[_series_or_empty(
                ratings_df, 'userId', dtype=str).astype(str) == user_id]

        query_parts = []
        if last_tour_name:
            query_parts.append(str(last_tour_name))
        if not user_preferences.empty:
            pref_row = user_preferences.iloc[0]
            query_parts.append(_build_user_query_text(pref_row))
        query_text = ' '.join(part for part in query_parts if part).strip()

        preference_scores = {}
        if query_text:
            try:
                query_vec = vectorizer.transform([query_text])
                similarities = cosine_similarity(query_vec, tfidf_matrix)[0]
                for idx, row in packages_df.iterrows():
                    preference_scores[row['packageId']
                                      ] = float(similarities[idx])
            except Exception as pref_score_error:
                print(
                    f"[Recommendations] Preference scoring warning: {pref_score_error}")

        rated_package_ids = set(_series_or_empty(
            user_ratings, 'packageId', dtype=str).astype(str).tolist())

        if model is not None and user_id in user_id_to_index and user_item_matrix is not None and not user_ratings.empty:
            user_index = int(user_id_to_index[user_id])
            try:
                # Model was trained on (items x users), but recommend() expects a (users x items) matrix
                transposed = (user_item_matrix.T).tocsr()
                print(
                    f"[DEBUG] Matrix shape before transpose: {user_item_matrix.shape}, after transpose: {transposed.shape}, user_index: {user_index}")
                # pass only the target user's row (1 x items) to recommend()
                user_items_matrix = user_item_matrix.tocsr()
                user_row = user_items_matrix.getrow(user_index)
                print(
                    f"[DEBUG] Passing user_items shape to recommend (single user): {user_row.shape}")
                candidate_count = max(num_recommendations * 4, 20)
                recommended_indices, scores = model.recommend(
                    user_index,
                    user_row,
                    N=candidate_count,
                    filter_already_liked_items=True,
                )
                print(
                    f"[DEBUG] ALS succeeded: got {len(recommended_indices)} recommendations")
            except Exception as als_error:
                print(
                    f"[Recommendations] ALS error for user {user_id}: {als_error}")
                traceback.print_exc()
                print("Falling back to content-based.")
                recommended_indices, scores = [], []

            recommendations = []
            for item_index, score in zip(recommended_indices, scores):
                package_id = index_to_package_id.get(int(item_index))
                if not package_id or package_id in rated_package_ids:
                    continue
                package_row = packages_df[packages_df['packageId']
                                          == package_id]
                if package_row.empty:
                    continue
                row = package_row.iloc[0]
                recommendations.append({
                    'packageId': package_id,
                    'packageName': row.get('packageName', ''),
                    'als_score': float(score),
                    'preference_score': float(preference_scores.get(package_id, 0.0)),
                })
                if len(recommendations) >= num_recommendations:
                    break

            if recommendations:
                als_values = np.array([rec.get('als_score', 0.0)
                                      for rec in recommendations], dtype=float)
                pref_values = np.array(
                    [rec.get('preference_score', 0.0) for rec in recommendations], dtype=float)

                if als_values.max() > als_values.min():
                    als_norm = (als_values - als_values.min()) / \
                        (als_values.max() - als_values.min())
                else:
                    als_norm = np.zeros_like(als_values)

                if pref_values.max() > pref_values.min():
                    pref_norm = (pref_values - pref_values.min()) / \
                        (pref_values.max() - pref_values.min())
                else:
                    pref_norm = np.zeros_like(pref_values)

                # Blend collaborative signal with live preference similarity.
                final_scores = 0.75 * als_norm + 0.25 * pref_norm

                for idx, rec in enumerate(recommendations):
                    rec['score'] = float(final_scores[idx])
                    rec.pop('als_score', None)
                    rec.pop('preference_score', None)

                recommendations.sort(key=lambda item: item.get(
                    'score', 0.0), reverse=True)
                recommendations = recommendations[:num_recommendations]

                return {
                    'user_id': user_id,
                    'method': 'collaborative',
                    'recommendations': recommendations,
                }

        recommendations = _recommend_content_based(
            packages_df=packages_df,
            tfidf_matrix=tfidf_matrix,
            vectorizer=vectorizer,
            query_text=query_text,
            num_recommendations=num_recommendations,
            exclude_ids=rated_package_ids,
        )

        return {
            'user_id': user_id,
            'method': 'content-based',
            'recommendations': recommendations,
        }
    except Exception as e:
        print(f"[Recommendations] Error: {e}")
        return {"error": str(e), "recommendations": []}
