import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { uploadToS3 } from '../../services/aws';
import { ExtendedProfile, writeExtendedProfile, readExtendedProfile } from '../../utils/profile';
import { useAuth } from '../../context/AuthContext';
import { profilesService } from '../../services';

const TagInput: React.FC<{ label: string; values: string[]; onChange: (v: string[]) => void }>= ({ label, values, onChange }) => {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-2 flex gap-2 flex-wrap">
        {values.map((v, i) => (
          <span key={i} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs flex items-center gap-1">
            {v}
            <button onClick={() => onChange(values.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-gray-700">×</button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={e=>setDraft(e.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Type and press Add" />
        <button type="button" onClick={() => { if (draft.trim()) { onChange([...values, draft.trim()]); setDraft(''); } }} className="px-3 py-2 bg-gray-100 rounded-md text-sm">Add</button>
      </div>
    </div>
  );
};

const Step: React.FC<{ title: string; children: React.ReactNode }>= ({ title, children }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const FilePicker: React.FC<{ label: string; onUploaded: (url: string)=>void }>= ({ label, onUploaded }) => {
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-2">
        <button type="button" disabled={loading} className="relative inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50">
          <Upload className="w-4 h-4" />
          <input aria-label="Upload image" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={async (e)=>{
            const f = e.target.files?.[0];
            if (!f) return;
            setLoading(true);
            try {
              const url = await uploadToS3(f);
              onUploaded(url);
            } finally {
              setLoading(false);
            }
          }} />
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

const ProfileWizard: React.FC<{ open: boolean; onClose: ()=>void }> = ({ open, onClose }) => {
  const { user } = useAuth();
  const initial = readExtendedProfile(user?.id);
  const [data, setData] = useState<ExtendedProfile>(initial);
  const [step, setStep] = useState(0);
  const close = () => onClose();
  const save = async () => {
    try {
      await profilesService.updateExtendedProfile(data);
      // Update local storage
      writeExtendedProfile(user?.id, data);
      // Trigger a page refresh to show updated data
      window.location.reload();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={close}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Complete Your Profile</h2>
          <button onClick={close} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5"/></button>
        </div>
        <div className="mb-6">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#26c66e]" style={{ width: `${((step+1)/5)*100}%`}} />
          </div>
        </div>

        {step===0 && (
          <Step title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Handle</label>
                <input value={data.handle||''} onChange={e=>setData({...data, handle: e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="@username" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nickname</label>
                <input value={data.nickname||''} onChange={e=>setData({...data, nickname: e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Display name" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Bio</label>
                <textarea value={data.bio||''} onChange={e=>setData({...data, bio: e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} placeholder="Tell something about you" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FilePicker label="Profile Photo" onUploaded={(url)=>setData({...data, profile_picture: url})} />
              <FilePicker label="Cover Photo" onUploaded={(url)=>setData({...data, cover_photo: url})} />
            </div>
          </Step>
        )}

        {step===1 && (
          <Step title="Location & Contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Lives In</label>
                <input value={data.lives_in||''} onChange={e=>setData({...data, lives_in: e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Hometown</label>
                <input value={data.hometown||''} onChange={e=>setData({...data, hometown: e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Website / Portfolio</label>
                <input value={data.website||''} onChange={e=>setData({...data, website: e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="https://..." />
              </div>
            </div>
          </Step>
        )}

        {step===2 && (
          <Step title="Education">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="School" value={data.education?.school||''} onChange={e=>setData({...data, education:{...data.education, school:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="College" value={data.education?.college||''} onChange={e=>setData({...data, education:{...data.education, college:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="University" value={data.education?.university||''} onChange={e=>setData({...data, education:{...data.education, university:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Year / Batch" value={data.education?.year_batch||''} onChange={e=>setData({...data, education:{...data.education, year_batch:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Department / Field of Study" value={data.education?.department||''} onChange={e=>setData({...data, education:{...data.education, department:e.target.value}})} className="md:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </Step>
        )}

        {step===3 && (
          <Step title="Work & Social">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Works At" value={data.work?.workplace||''} onChange={e=>setData({...data, work:{...data.work, workplace:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Position / Role" value={data.work?.role||''} onChange={e=>setData({...data, work:{...data.work, role:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Previous Workplaces" value={data.work?.previous||''} onChange={e=>setData({...data, work:{...data.work, previous:e.target.value}})} className="md:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Facebook URL" value={data.socials?.facebook||''} onChange={e=>setData({...data, socials:{...data.socials, facebook:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Instagram URL" value={data.socials?.instagram||''} onChange={e=>setData({...data, socials:{...data.socials, instagram:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="LinkedIn URL" value={data.socials?.linkedin||''} onChange={e=>setData({...data, socials:{...data.socials, linkedin:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="GitHub URL" value={data.socials?.github||''} onChange={e=>setData({...data, socials:{...data.socials, github:e.target.value}})} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </Step>
        )}

        {step===4 && (
          <Step title="Interests & Skills">
            <TagInput label="Interests" values={data.interests||[]} onChange={(v)=>setData({...data, interests: v})} />
            <TagInput label="Skills" values={data.skills||[]} onChange={(v)=>setData({...data, skills: v})} />
          </Step>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))} className="px-4 py-2 rounded-md border">Back</button>
          {step<4 ? (
            <button onClick={()=>setStep(s=>Math.min(4,s+1))} className="px-4 py-2 rounded-md bg-[#26c66e] text-white">Next</button>
          ) : (
            <button onClick={save} className="px-4 py-2 rounded-md bg-[#26c66e] text-white">Save</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileWizard;
