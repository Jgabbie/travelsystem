import React, { useState } from 'react';
import { Modal, Button, Upload, message, ConfigProvider } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import '../style/uploadpassportmodal.css';

export default function UploadPassportModal({ open, onCancel, onProceed }) {
    const [fileList, setFileList] = useState([]);

    const handleProceed = () => {
        if (!fileList.length) {
            message.warning('Please upload a passport image before proceeding.');
            return;
        }
        onProceed?.();
    };

    const handleCancel = () => {
        setFileList([]);
        onCancel?.();
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <Modal
                open={open}
                onCancel={handleCancel}
                footer={null}
                width={800}
                centered
                className="upload-passport-modal"
            >
                <div className="upload-passport-wrapper">
                    <h2 className="upload-passport-title">Upload Passport</h2>
                    <p className="upload-passport-text">
                        Please upload a clear image of your passport bio page.
                    </p>

                    <Upload
                        fileList={fileList}
                        beforeUpload={() => false}
                        onChange={({ fileList: nextList }) => setFileList(nextList)}
                        accept="image/*,application/pdf"
                        maxCount={1}
                        className="upload-passport-uploader"
                    >
                        <Button icon={<UploadOutlined />} type="dashed">
                            Select File
                        </Button>
                    </Upload>

                    <div className="upload-passport-actions">
                        <Button
                            type="primary"
                            onClick={handleProceed}
                            disabled={!fileList.length}
                        >
                            Proceed
                        </Button>
                        <Button
                            danger
                            onClick={handleCancel}
                            style={{ marginLeft: 10 }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </ConfigProvider>
    );
}