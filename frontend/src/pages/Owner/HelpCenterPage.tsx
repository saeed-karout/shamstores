// pages/Owner/HelpCenterPage.tsx — مركز المساعدة
//
// ثلاثة أشياء بترتيب ما يحتاجه تاجرٌ جديد:
//   1. قائمة البداية — محسوبةٌ من بياناته الفعلية في الخادم، لا خاناتٌ يعلّمها
//      بيده. كل خطوة رابطٌ إلى الشاشة التي تُنجزها.
//   2. إنسانٌ على واتساب — حين لا يكفي الشرح.
//   3. مقاطع شرح قصيرة — يضبطها مشرف المنصّة.
//
// **المقاطع صورةٌ حتى يُضغط عليها:** إطار يوتيوب واحد يسحب قرابة ميغابايت من
// السكربتات، وعشرة إطارات تجعل الصفحة تزحف على اتصالٍ سوري. الصورة المصغّرة
// خفيفة، والإطار يُحمَّل لمقطعٍ واحد حين يطلبه التاجر فعلاً.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoCheckmark, IoChevronBack, IoLogoWhatsapp, IoPlay, IoTimeOutline } from 'react-icons/io5';
import api from '@/services/api';
import { useSupportConfig, supportWhatsappUrl, TutorialVideo } from '@/hooks/useSupportConfig';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import '@/styles/trust.css';

interface ChecklistItem {
  key: string;
  title: string;
  hint: string;
  done: boolean;
  link: string;
  optional?: boolean;
  pending?: boolean;
  progress?: { current: number; target: number };
}

interface Checklist {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

const VideoCard: React.FC<{ video: TutorialVideo }> = ({ video }) => {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="ss-card tr-video">
      <div className="tr-video-frame">
        {playing ? (
          // youtube-nocookie: لا ملفات تتبّع قبل أن يشغّل التاجر المقطع
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <>
            <img src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
            <button type="button" className="tr-video-play" onClick={() => setPlaying(true)} aria-label={`تشغيل: ${video.title}`}>
              <span>
                <IoPlay size={24} style={{ marginInlineStart: 3 }} />
              </span>
            </button>
            {video.duration && <span className="tr-video-dur">{video.duration}</span>}
          </>
        )}
      </div>
      <div className="tr-video-title">{video.title}</div>
    </article>
  );
};

const HelpCenterPage: React.FC = () => {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: support, isLoading: supportLoading } = useSupportConfig();
  const { data: business } = useBusinessSummary();

  useEffect(() => {
    api
      .get<Checklist>('/support/checklist')
      .then(setChecklist)
      .catch(() => setChecklist(null))
      .finally(() => setLoading(false));
  }, []);

  const pct = checklist && checklist.total ? Math.round((checklist.completed / checklist.total) * 100) : 0;
  const allDone = !!checklist && checklist.completed >= checklist.total;

  return (
    <div className="ss-page">
      <div className="tr-page">
        <header className="tr-head">
          <h1>مركز المساعدة</h1>
          <p>خطوات قليلة تفصلك عن متجرٍ جاهز للبيع — وفريقنا على واتساب إن احتجت يداً.</p>
        </header>

        <section className="ss-card tr-card" aria-labelledby="hc-steps">
          <h2 id="hc-steps">
            {allDone ? 'أنهيت خطوات البداية 🎉' : 'خطوات البداية'}
            {checklist && (
              <span className="tr-pill tone-green" style={{ marginInlineStart: 'auto' }}>
                {checklist.completed} من {checklist.total}
              </span>
            )}
          </h2>
          {checklist && (
            <div className="tr-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة الإنجاز">
              <span style={{ width: `${pct}%` }} />
            </div>
          )}

          {loading ? (
            <ul className="tr-steps" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="tr-step" style={{ height: 58, background: 'var(--d-surface)' }} />
              ))}
            </ul>
          ) : !checklist ? (
            <p style={{ margin: 0, color: 'var(--d-muted)', fontSize: 13.5 }}>تعذّر تحميل الخطوات الآن — حدّث الصفحة بعد قليل.</p>
          ) : (
            <ol className="tr-steps">
              {checklist.items.map((item, i) => (
                <li key={item.key}>
                  <Link to={item.link} className={`tr-step ${item.done ? 'is-done' : ''}`}>
                    <span className="tr-step-ico" aria-hidden="true">
                      {item.done ? <IoCheckmark size={16} /> : i + 1}
                    </span>
                    <span className="tr-step-text">
                      <span className="tr-step-title">
                        {item.title}
                        {item.optional && !item.done && (
                          <span className="tr-pill tone-gray" style={{ marginInlineStart: 8 }}>اختياري</span>
                        )}
                        {item.pending && (
                          <span className="tr-pill tone-amber" style={{ marginInlineStart: 8 }}>
                            <IoTimeOutline size={12} /> قيد المراجعة
                          </span>
                        )}
                      </span>
                      {!item.done && <span className="tr-step-hint">{item.hint}</span>}
                    </span>
                    <span className="sr-only">{item.done ? '(منجزة)' : '(غير منجزة)'}</span>
                    <IoChevronBack size={18} className="tr-step-go" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {!supportLoading && support?.whatsapp && (
          <section className="ss-card tr-card">
            <h2>
              <IoLogoWhatsapp size={22} color="#1faa53" /> تكلّم مع إنسان
            </h2>
            <p>
              فريق دعم شام ستورز يردّ على واتساب بالعربي — في إعداد المتجر، ربط النطاق، التوصيل، أو أيّ شيءٍ عالق.
            </p>
            <div className="tr-actions">
              <a
                className="ss-btn ss-btn-primary"
                style={{ background: '#1faa53' }}
                href={supportWhatsappUrl(support.whatsapp, business?.name)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IoLogoWhatsapp size={18} /> الدعم عبر واتساب
              </a>
              <span dir="ltr" style={{ color: 'var(--d-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                +{support.whatsapp}
              </span>
            </div>
          </section>
        )}

        {!!support?.videos?.length && (
          <section className="tr-card" style={{ padding: 0 }} aria-labelledby="hc-videos">
            <h2 id="hc-videos">شروحات قصيرة</h2>
            <div className="tr-videos">
              {support.videos.map((v) => (
                <VideoCard key={v.youtubeId + v.title} video={v} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default HelpCenterPage;
