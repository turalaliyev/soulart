import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Trash2 } from 'lucide-react';
import { getBackend } from '../lib/backend';
import type { ContactMessage } from '../lib/types';
import { ConfirmDialog, PageHeader, useToast } from './ui';

export default function Messages() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => (await getBackend()).listMessages(),
    staleTime: 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['messages'] });

  async function toggleRead(message: ContactMessage) {
    try {
      await (await getBackend()).setMessageRead(message.id, !message.is_read);
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await (await getBackend()).deleteMessage(deleting.id);
      toast('Message deleted');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setDeleting(null);
  }

  return (
    <>
      <PageHeader title="Messages" subtitle="Sent through the website's contact form." />
      {isPending && <p className="muted">Loading...</p>}
      {isError && <p className="field-error" role="alert">{(error as Error).message}</p>}
      {data?.length === 0 && (
        <div className="empty-state">
          <Mail size={32} aria-hidden="true" />
          <h2>No messages yet</h2>
        </div>
      )}
      <ul className="messages">
        {data?.map((message) => (
          <li key={message.id} className={message.is_read ? 'message' : 'message message-unread'}>
            <div className="message-head">
              <div>
                <strong>{message.name}</strong>
                <a href={`mailto:${message.email}`}>{message.email}</a>
              </div>
              <time className="muted" dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
            </div>
            <p className="message-body">{message.message}</p>
            <div className="message-actions">
              <a className="btn" href={`mailto:${message.email}`}>Reply by email</a>
              <button className="btn" onClick={() => toggleRead(message)}>{message.is_read ? 'Mark as unread' : 'Mark as read'}</button>
              <button className="icon-btn icon-btn-danger" onClick={() => setDeleting(message)} aria-label={`Delete message from ${message.name}`}><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDialog
          title="Delete this message?"
          body={`The message from ${deleting.name} will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
