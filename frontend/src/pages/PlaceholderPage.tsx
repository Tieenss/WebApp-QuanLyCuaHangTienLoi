import React from 'react';
import { Card, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
    title: string;
    subTitle: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, subTitle }) => {
    const navigate = useNavigate();

    return (
        <Card className="placeholder-card">
            <Result
                status="info"
                title={title}
                subTitle={subTitle}
                extra={
                    <Button
                        type="primary"
                        onClick={() => navigate('/')}
                        className="placeholder-back-btn"
                    >
                        Quay Về Trang Dashboard
                    </Button>
                }
            />
        </Card>
    );
};
