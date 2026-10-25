'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, FolderGit2, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import type { OrganizationRow } from '@/types';
import { toPersianDigits } from '@/lib/persian';
import { Button, Field, inputClass, selectClass } from '@/components/ui/Primitives';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { useServerAction } from '@/lib/useServerAction';
import {
  createProjectAction,
  deleteOrganizationAction,
  deleteProjectAction,
  updateOrganizationAction,
  updateProjectAction,
} from '@/app/actions/admin';

const initial = { ok: false } as { ok: boolean; error?: string; message?: string };
type Project = OrganizationRow['projects'][number];

export function OrganizationCard({ organization, isAdmin }: { organization: OrganizationRow; isAdmin: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteCompanyOpen, setDeleteCompanyOpen] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<Project | null>(null);

  const [createState, , createPending, createSubmit] = useServerAction(createProjectAction, initial);
  const [updateOrgState, , updateOrgPending, updateOrgSubmit] = useServerAction(updateOrganizationAction, initial);
  const [deleteOrgState, , deleteOrgPending, deleteOrgSubmit] = useServerAction(deleteOrganizationAction, initial);
  const [updateProjectState, , updateProjectPending, updateProjectSubmit] = useServerAction(updateProjectAction, initial);
  const [deleteProjectState, , deleteProjectPending, deleteProjectSubmit] = useServerAction(deleteProjectAction, initial);

  async function saveOrganization(formData: FormData) {
    const result = await updateOrgSubmit(formData);
    if (result.ok) {
      setEditOpen(false);
      router.refresh();
    }
  }

  async function toggleOrganizationStatus() {
    const fd = new FormData();
    fd.set('organizationId', organization.id);
    fd.set('nameFa', organization.name_fa);
    fd.set('code', organization.code);
    fd.set('field', organization.field ?? '');
    fd.set('city', organization.city ?? '');
    fd.set('status', organization.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    const result = await updateOrgSubmit(fd);
    if (result.ok) router.refresh();
  }

  async function createProject(formData: FormData) {
    const result = await createSubmit(formData);
    if (result.ok) {
      setCreateProjectOpen(false);
      router.refresh();
    }
  }

  async function saveProject(formData: FormData) {
    const result = await updateProjectSubmit(formData);
    if (result.ok) {
      setEditingProject(null);
      router.refresh();
    }
  }

  async function deleteCompany() {
    const fd = new FormData();
    fd.set('organizationId', organization.id);
    const result = await deleteOrgSubmit(fd);
    if (result.ok) {
      setDeleteCompanyOpen(false);
      router.refresh();
    }
  }

  async function deleteProject() {
    if (!deleteProjectTarget) return;
    const fd = new FormData();
    fd.set('projectId', deleteProjectTarget.id);
    const result = await deleteProjectSubmit(fd);
    if (result.ok) {
      setDeleteProjectTarget(null);
      router.refresh();
    }
  }

  return (
    <article className={`space-y-4 rounded-[var(--radius-lg)] border bg-white p-5 transition-soft hover:border-slate-300 ${organization.status === 'ACTIVE' ? 'border-slate-200' : 'border-amber-200 opacity-90'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-teal-200 bg-teal-50">
            <Building2 className="h-5 w-5 text-teal-700" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-sm font-bold text-slate-900">{organization.name_fa}</h3>
            <p className="dir-ltr mt-0.5 break-all font-mono text-[11px] text-slate-400">
              {organization.code}{organization.city ? ` · ${organization.city}` : ''}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-[var(--radius-sm)] border px-2 py-0.5 text-[10px] font-semibold ${organization.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {organization.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
        </span>
      </div>

      {organization.field && (
        <p className="rounded-[var(--radius-md)] bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <span className="mb-0.5 block font-semibold text-slate-800">حوزه فعالیت:</span>
          {organization.field}
        </p>
      )}

      <div className="border-t border-slate-100 pt-3 text-xs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-semibold text-slate-700">
            <FolderGit2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            پروژه‌های مرتبط ({toPersianDigits(organization.projects.length)})
          </p>
          {isAdmin && (
            <Button variant="secondary" className="px-2 py-1 text-[11px]" onClick={() => setCreateProjectOpen(true)}>
              <Plus className="h-3 w-3" aria-hidden />
              افزودن پروژه
            </Button>
          )}
        </div>
        {organization.projects.length === 0 ? (
          <p className="text-[11px] text-slate-400">پروژه‌ای ثبت نشده است.</p>
        ) : (
          <ul className="space-y-1.5">
            {organization.projects.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-slate-50 p-2 text-[11px]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{project.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {project.city ?? 'شهر ثبت نشده'} · {project.status === 'ACTIVE' ? 'فعال' : project.status === 'COMPLETED' ? 'تکمیل‌شده' : 'در برنامه'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setEditingProject(project)} title="ویرایش پروژه" aria-label={`ویرایش ${project.name}`} className="rounded-md p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-800">
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setDeleteProjectTarget(project)} title="حذف پروژه" aria-label={`حذف ${project.name}`} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <Button variant="secondary" className="px-2.5 py-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            ویرایش شرکت
          </Button>
          <Button variant="ghost" className="px-2.5 py-1.5" onClick={() => void toggleOrganizationStatus()}>
            <Power className="h-3.5 w-3.5" aria-hidden />
            {organization.status === 'ACTIVE' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
          </Button>
          <Button variant="ghost" className="px-2.5 py-1.5 text-rose-700 hover:bg-rose-50" onClick={() => setDeleteCompanyOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            حذف
          </Button>
        </div>
      )}

      {(updateOrgState.error || deleteOrgState.error || createState.error || updateProjectState.error || deleteProjectState.error) && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-[11px] leading-5 text-rose-800">
          {updateOrgState.error || deleteOrgState.error || createState.error || updateProjectState.error || deleteProjectState.error}
        </p>
      )}
      {(updateOrgState.message || deleteOrgState.message || createState.message || updateProjectState.message || deleteProjectState.message) && (
        <p role="status" className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">
          {updateOrgState.message || deleteOrgState.message || createState.message || updateProjectState.message || deleteProjectState.message}
        </p>
      )}

      {editOpen && (
        <Modal open onClose={() => setEditOpen(false)} title="ویرایش اطلاعات شرکت">
          <form action={saveOrganization} className="space-y-4 text-xs">
            <input type="hidden" name="organizationId" value={organization.id} />
            <Field label="نام شرکت (فارسی)" htmlFor={`org-name-${organization.id}`} required>
              <input id={`org-name-${organization.id}`} name="nameFa" required defaultValue={organization.name_fa} maxLength={200} className={inputClass} />
            </Field>
            <Field label="کد سازمانی" htmlFor={`org-code-${organization.id}`} required>
              <input id={`org-code-${organization.id}`} name="code" dir="ltr" required defaultValue={organization.code} maxLength={60} className={`${inputClass} dir-ltr font-mono`} />
            </Field>
            <Field label="حوزه فعالیت" htmlFor={`org-field-${organization.id}`}>
              <input id={`org-field-${organization.id}`} name="field" defaultValue={organization.field ?? ''} maxLength={300} className={inputClass} />
            </Field>
            <Field label="شهر مرکزی" htmlFor={`org-city-${organization.id}`}>
              <input id={`org-city-${organization.id}`} name="city" defaultValue={organization.city ?? ''} maxLength={80} className={inputClass} />
            </Field>
            <Field label="وضعیت ساختار" htmlFor={`org-status-${organization.id}`}>
              <select id={`org-status-${organization.id}`} name="status" defaultValue={organization.status} className={selectClass}>
                <option value="ACTIVE">فعال</option>
                <option value="INACTIVE">غیرفعال</option>
              </select>
            </Field>
            {updateOrgState.error && <p role="alert" className="text-rose-700">{updateOrgState.error}</p>}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Button type="submit" loading={updateOrgPending}>ذخیره تغییرات</Button>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>انصراف</Button>
            </div>
          </form>
        </Modal>
      )}

      {createProjectOpen && (
        <Modal open onClose={() => setCreateProjectOpen(false)} title={`افزودن پروژه به «${organization.name_fa}»`}>
          <form action={createProject} className="space-y-4 text-xs">
            <input type="hidden" name="organizationId" value={organization.id} />
            <Field label="نام پروژه" htmlFor={`project-new-name-${organization.id}`} required>
              <input id={`project-new-name-${organization.id}`} name="name" required maxLength={200} className={inputClass} />
            </Field>
            <Field label="شهر پروژه" htmlFor={`project-new-city-${organization.id}`}>
              <input id={`project-new-city-${organization.id}`} name="city" maxLength={80} className={inputClass} />
            </Field>
            <Field label="وضعیت" htmlFor={`project-new-status-${organization.id}`}>
              <select id={`project-new-status-${organization.id}`} name="status" defaultValue="ACTIVE" className={selectClass}>
                <option value="ACTIVE">فعال</option><option value="PLANNING">در برنامه</option><option value="COMPLETED">تکمیل‌شده</option>
              </select>
            </Field>
            {createState.error && <p role="alert" className="text-rose-700">{createState.error}</p>}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Button type="submit" loading={createPending}>ثبت پروژه</Button>
              <Button type="button" variant="ghost" onClick={() => setCreateProjectOpen(false)}>انصراف</Button>
            </div>
          </form>
        </Modal>
      )}

      {editingProject && (
        <Modal open onClose={() => setEditingProject(null)} title="ویرایش پروژه">
          <form action={saveProject} className="space-y-4 text-xs">
            <input type="hidden" name="projectId" value={editingProject.id} />
            <Field label="نام پروژه" htmlFor="project-edit-name" required>
              <input id="project-edit-name" name="name" required defaultValue={editingProject.name} maxLength={200} className={inputClass} />
            </Field>
            <Field label="شهر پروژه" htmlFor="project-edit-city">
              <input id="project-edit-city" name="city" defaultValue={editingProject.city ?? ''} maxLength={80} className={inputClass} />
            </Field>
            <Field label="وضعیت" htmlFor="project-edit-status">
              <select id="project-edit-status" name="status" defaultValue={editingProject.status} className={selectClass}>
                <option value="ACTIVE">فعال</option><option value="PLANNING">در برنامه</option><option value="COMPLETED">تکمیل‌شده</option>
              </select>
            </Field>
            {updateProjectState.error && <p role="alert" className="text-rose-700">{updateProjectState.error}</p>}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Button type="submit" loading={updateProjectPending}>ذخیره تغییرات</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingProject(null)}>انصراف</Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteCompanyOpen}
        title="حذف شرکت از ساختار"
        message="حذف کامل فقط زمانی انجام می‌شود که هیچ پروژه، سابقه کاری یا فرصت شغلی به این شرکت مرتبط نباشد. اگر داده‌های تاریخی به شرکت وابسته باشند، حذف مسدود می‌شود و می‌توانید شرکت را غیرفعال کنید."
        confirmLabel="حذف شرکت"
        variant="danger"
        onConfirm={() => void deleteCompany()}
        onCancel={() => setDeleteCompanyOpen(false)}
      />
      <ConfirmDialog
        open={deleteProjectTarget !== null}
        title="حذف پروژه"
        message={`آیا پروژه «${deleteProjectTarget?.name ?? ''}» حذف شود؟ این کار قابل بازگشت نیست.`}
        confirmLabel="حذف پروژه"
        variant="danger"
        onConfirm={() => void deleteProject()}
        onCancel={() => setDeleteProjectTarget(null)}
      />
    </article>
  );
}
