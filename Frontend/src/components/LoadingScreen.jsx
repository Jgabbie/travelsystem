import React, { useEffect } from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import '../style/loadingscreen.css';

export default function LoadingScreen({ isVisible, message = 'Loading...' }) {

    if (!isVisible) return null;

    return (
        <div className='loading-screen-overlay'>
            <div className='loading-screen-content'>
                <Spin
                    indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />}
                    size="large"
                />
                <p className='loading-message'>{message}</p>
            </div>
        </div>
    );
}
