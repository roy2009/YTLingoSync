'use client';

import { useState } from 'react';
import AlertMessage from '../components/AlertMessage';
import AddSubscriptionForm from '../components/subscriptions/AddSubscriptionForm';
import SubscriptionList from '../components/subscriptions/SubscriptionList';
import { useSubscriptions } from '../hooks/useSubscriptions';

export default function SubscriptionsPage() {
  const {
    subscriptions,
    loading,
    error,
    message,
    setMessage,
    testConnection,
    addSubscription,
    syncSubscription,
    deleteSubscription,
    updateSubscription
  } = useSubscriptions();

  return (
    <div className="page-container">
      <div className="content-container-sm">
        <div className="mb-6">
          <h1 className="page-title">订阅管理</h1>

          {/* 添加订阅表单 */}
          <AddSubscriptionForm
            onAdd={addSubscription}
            onTest={testConnection}
            message={message}
            onMessageChange={setMessage}
          />

          {/* 订阅列表 */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">已订阅列表</h2>
            </div>

            <SubscriptionList
              subscriptions={subscriptions}
              loading={loading}
              onSync={syncSubscription}
              onEdit={updateSubscription}
              onDelete={deleteSubscription}
            />
          </div>
        </div>
      </div>
    </div>
  );
}