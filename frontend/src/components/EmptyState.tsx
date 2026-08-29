import type { FC } from 'react';
import { Card, Empty, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import './EmptyState.css';

const { Text } = Typography;

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Bọc trong Card khi đặt trực tiếp trên trang. */
  inCard?: boolean;
}

/** Trạng thái rỗng dùng chung, thay cho Empty mặc định của antd. */
export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  inCard = false,
}) => {
  const content = (
    <Empty
      className="empty-state"
      image={<InboxOutlined className="empty-state-icon" />}
      description={
        <div>
          <Text strong className="empty-state-title">
            {title}
          </Text>
          {description !== undefined && (
            <Text type="secondary" className="empty-state-desc">
              {description}
            </Text>
          )}
        </div>
      }
    />
  );

  return inCard ? <Card>{content}</Card> : content;
};
