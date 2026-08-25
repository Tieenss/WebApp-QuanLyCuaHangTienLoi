import React from 'react';
import { Card, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

interface PlaceholderPageProps {
    title: string;
    subTitle: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, subTitle }) => {
    const navigate = useNavigate();

    return (
        <Card style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Result
                status="info"
                title={title}
                subTitle={subTitle}
                extra={
                    <Button
                        type="primary"
                        onClick={() => navigate('/')}
                        style={{ backgroundColor: '#E31837', borderColor: '#E31837' }}
                    >
                        Quay Về Trang Dashboard
                    </Button>
                }
            />
        </Card>
    );
};
