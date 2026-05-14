// src/components/settings/SocialSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { 
  IoLogoInstagram, IoLogoFacebook, IoLogoWhatsapp, IoLogoTiktok,
  IoLogoTwitter, IoLogoYoutube, IoLogoLinkedin, IoLogoSnapchat,
  IoShareSocial, IoLink
} from 'react-icons/io5';
import Button from '@/components/common/Button';
import { SocialMediaLinks } from '@/types/stores/settings.types';

interface SocialSettingsTabProps {
  initialData: SocialMediaLinks;
  onSave: (data: SocialMediaLinks) => Promise<void>;
  saving?: boolean;
}

const SocialSettingsTab: React.FC<SocialSettingsTabProps> = ({ initialData, onSave, saving }) => {
  const [social, setSocial] = useState<SocialMediaLinks>({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
    youtube: '',
    linkedin: '',
    snapchat: ''
  });

  useEffect(() => {
    if (initialData) {
      setSocial(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(social);
  };

  const socialFields = [
    { key: 'instagram', label: 'انستغرام', icon: IoLogoInstagram, color: 'text-pink-500', placeholder: '@username' },
    { key: 'facebook', label: 'فيسبوك', icon: IoLogoFacebook, color: 'text-blue-600', placeholder: 'username' },
    { key: 'tiktok', label: 'تيك توك', icon: IoLogoTiktok, color: 'text-black', placeholder: '@username' },
    { key: 'twitter', label: 'تويتر', icon: IoLogoTwitter, color: 'text-blue-400', placeholder: '@username' },
    { key: 'youtube', label: 'يوتيوب', icon: IoLogoYoutube, color: 'text-red-600', placeholder: 'channel' },
    { key: 'linkedin', label: 'لينكد إن', icon: IoLogoLinkedin, color: 'text-blue-700', placeholder: 'company' },
    { key: 'snapchat', label: 'سناب شات', icon: IoLogoSnapchat, color: 'text-yellow-500', placeholder: '@username' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoShareSocial className="text-green-600" />
        وسائل التواصل الاجتماعي
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {socialFields.map(field => {
          const Icon = field.icon;
          return (
            <div key={field.key}>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Icon className={field.color} size={18} />
                {field.label}
              </label>
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <IoLink size={16} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  value={social[field.key as keyof SocialMediaLinks] || ''}
                  onChange={(e) => setSocial({ ...social, [field.key]: e.target.value })}
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder={field.placeholder}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button type="submit" variant="primary" className="mt-4" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </form>
  );
};

export default SocialSettingsTab;