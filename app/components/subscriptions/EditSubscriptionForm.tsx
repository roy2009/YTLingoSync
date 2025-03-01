import { useState } from 'react';
import { Subscription, EditSubscriptionForm as EditForm } from '../../types/subscription';

interface EditSubscriptionFormProps {
  subscription: Subscription;
  onSave: (id: string, form: EditForm) => Promise<boolean>;
  onCancel: () => void;
}

export default function EditSubscriptionForm({
  subscription,
  onSave,
  onCancel
}: EditSubscriptionFormProps) {
  const [form, setForm] = useState<EditForm>({
    name: subscription.name,
    maxDurationForTranslation: subscription.maxDurationForTranslation ?? null,
    targetLanguage: subscription.targetLanguage || 'Chinese',
    autoTranslate: subscription.autoTranslate !== false,
    initialFetchCount: subscription.initialFetchCount || 5
  });

  const handleSave = async () => {
    const success = await onSave(subscription.id, form);
    if (success) {
      onCancel();
    }
  };

  return (
    <div className="bg-gray-900/70 border border-gray-700/50 backdrop-blur-md rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">编辑订阅设置</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">名称</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">目标语言</label>
          <select
            value={form.targetLanguage}
            onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })}
            className="form-select w-full"
          >
            <option value="Chinese">中文</option>
            <option value="English">英语</option>
            <option value="Japanese">日语</option>
            <option value="Korean">韩语</option>
            <option value="French">法语</option>
            <option value="German">德语</option>
            <option value="Spanish">西班牙语</option>
            <option value="Russian">俄语</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">最大翻译时长 (分钟)</label>
          <input
            type="number"
            placeholder="不限制"
            value={form.maxDurationForTranslation ? Math.floor(form.maxDurationForTranslation / 60) : ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) * 60 : null;
              setForm({ ...form, maxDurationForTranslation: value });
            }}
            className="form-input w-full"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">留空表示不限制，超过此时长的视频将不会自动翻译</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">首次同步视频数量</label>
          <input
            type="number"
            placeholder="5"
            value={form.initialFetchCount}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : 5;
              setForm({ ...form, initialFetchCount: value });
            }}
            className="form-input w-full"
            min="1"
            max="50"
          />
          <p className="text-xs text-gray-500 mt-1">首次订阅时获取的最新视频数量（最大50个）</p>
        </div>

        <div className="flex items-center">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.autoTranslate}
              onChange={(e) => setForm({ ...form, autoTranslate: e.target.checked })}
              className="form-checkbox"
            />
            <span>自动翻译新视频</span>
          </label>
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <button onClick={handleSave} className="btn btn-primary">保存</button>
        <button onClick={onCancel} className="btn btn-secondary">取消</button>
      </div>
    </div>
  );
} 