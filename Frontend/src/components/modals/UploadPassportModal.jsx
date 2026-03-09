import React, { useState } from 'react';
import { Modal, Button, Upload, message, ConfigProvider } from 'antd';
import '../../style/components/modals/uploadpassportmodal.css';

export default function UploadPassportModal({ open, onCancel, onProceed, summary }) {
    const travelerCount = summary?.travelerCount?.adult + summary?.travelerCount?.child + summary?.travelerCount?.infant || 0;

    const [fileLists, setFileLists] = useState(Array(travelerCount).fill([]));
    const [previews, setPreviews] = useState(Array(travelerCount).fill(null));

    const handleProceed = () => {
        const allUploaded = fileLists.every(list => list.length > 0);
        if (!allUploaded) {
            message.warning('Please upload passport images for all travelers before proceeding.');
            return;
        }
        onProceed?.();
    };

    const handleCancel = () => {
        setFileLists(Array(travelerCount).fill([]));
        setPreviews(Array(travelerCount).fill(null));
        onCancel?.();
    };

    const handleChange = (index) => ({ fileList: nextList }) => {
        const newFileLists = [...fileLists];
        newFileLists[index] = nextList;
        setFileLists(newFileLists);

        const newPreviews = [...previews];
        if (nextList.length > 0) {
            newPreviews[index] = URL.createObjectURL(nextList[0].originFileObj);
        } else {
            newPreviews[index] = null;
        }
        setPreviews(newPreviews);
    };

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            <Modal
                open={open}
                onCancel={handleCancel}
                footer={null}
                width={1000}
                centered
                className="upload-passport-modal"
            >
                <h2 className="upload-passport-title">Upload Passport</h2>
                <div className="upload-passport-wrapper">
                    <p className="upload-passport-text">
                        Please upload a clear image of your passport bio page for each traveler.
                    </p>

                    {Array.from({ length: travelerCount }).map((_, index) => (
                        <div key={index} className="upload-card">

                            <div className='upload-passport-left'>
                                <h4>Traveler {index + 1}</h4>
                                <Upload
                                    fileList={fileLists[index]}
                                    beforeUpload={() => false}
                                    onChange={handleChange(index)}
                                    accept="image/*,application/pdf"
                                    maxCount={1}
                                    showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                                >
                                    <Button type="default">
                                        {fileLists[index]?.length > 0 ? 'Change File' : 'Upload File'}
                                    </Button>
                                </Upload>
                            </div>



                            <div className="upload-passport-right">
                                {previews[index] && (
                                    <div className="passport-preview" style={{ marginTop: '10px' }}>
                                        <img
                                            src={previews[index]}
                                            alt={`Passport Preview ${index + 1}`}
                                            className="passport-preview-image"
                                        />
                                    </div>
                                )}
                            </div>




                        </div>
                    ))}
                </div>
                <div className="upload-passport-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Button
                        className='upload-passport-proceed'
                        type="primary"
                        onClick={handleProceed}
                        disabled={fileLists.some(list => list.length === 0)}
                    >
                        Proceed
                    </Button>
                    <Button
                        className='upload-passport-cancel'
                        danger
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                </div>
            </Modal>
        </ConfigProvider >
    );
}