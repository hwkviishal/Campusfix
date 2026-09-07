import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ComplaintComment, UserRole } from '../types';
import { apiService } from '../services/api';
import {
  MessageSquare,
  Send,
  Lock,
  Loader2,
  Shield,
  Wrench,
  GraduationCap,
  Clock,
} from 'lucide-react';

interface CommentThreadProps {
  complaintId: string;
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
          <Shield className="w-2.5 h-2.5" />
          Admin
        </span>
      );
    case 'TECHNICIAN':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          <Wrench className="w-2.5 h-2.5" />
          Technician
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
          <GraduationCap className="w-2.5 h-2.5" />
          Student
        </span>
      );
  }
}

function formatCommentDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CommentThread: React.FC<CommentThreadProps> = ({ complaintId }) => {
  const { user } = useAuth();
  const { joinComplaint, leaveComplaint, onCommentNew } = useSocket();

  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  // Load existing comments
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService
      .getComplaintComments(complaintId)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setComments(res.data.comments || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load comments.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [complaintId]);

  // Join complaint real-time room and subscribe to new comments
  useEffect(() => {
    joinComplaint(complaintId);

    const unsubscribe = onCommentNew((newComment) => {
      // Check if comment belongs to this complaint
      if (newComment.complaint === complaintId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === newComment._id)) return prev;
          return [...prev, newComment];
        });
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });

    return () => {
      leaveComplaint(complaintId);
      unsubscribe();
    };
  }, [complaintId, joinComplaint, leaveComplaint, onCommentNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiService.addComplaintComment(complaintId, {
        message: message.trim(),
        isInternal: isStaff ? isInternal : false,
      });

      if (res.success && res.data?.comment) {
        const addedComment = res.data.comment;
        setComments((prev) => {
          if (prev.some((c) => c._id === addedComment._id)) return prev;
          return [...prev, addedComment];
        });
        setMessage('');
        setIsInternal(false);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="complaint-comments-thread"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Communication & Activity Notes</h3>
            <p className="text-xs text-slate-500">
              Real-time message thread between student, technicians, and campus admins.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {/* Comment List */}
      <div className="p-5 space-y-4 max-h-[450px] overflow-y-auto">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading message thread...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No comments on this complaint yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Post an update or question below to start the conversation.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.author?._id === user?.id || (comment.author as any)?.id === user?.id;

            return (
              <div
                key={comment._id}
                id={`comment-item-${comment._id}`}
                className={`p-4 rounded-xl border transition-all ${
                  comment.isInternal
                    ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                    : isMe
                    ? 'bg-blue-50/40 border-blue-100'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        comment.isInternal
                          ? 'bg-amber-200 text-amber-900'
                          : isMe
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : '?'}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900">
                        {comment.author?.name || 'Unknown Author'}
                        {isMe && <span className="text-slate-400 font-normal ml-1">(You)</span>}
                      </span>
                      {comment.author?.role && getRoleBadge(comment.author.role)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {comment.isInternal && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs">
                        <Lock className="w-2.5 h-2.5" />
                        Internal Staff Note
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pl-9">
                  {comment.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border-t border-slate-200">
        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <textarea
            id="comment-input-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isInternal
                ? 'Type an internal note (only visible to admins & assigned technicians)...'
                : 'Write a message or update for this complaint...'
            }
            rows={3}
            className={`w-full text-xs rounded-lg border p-3 focus:outline-hidden focus:ring-2 focus:bg-white transition-all resize-none ${
              isInternal
                ? 'border-amber-300 bg-amber-50/40 focus:ring-amber-500/30'
                : 'border-slate-200 bg-white focus:ring-blue-500/30'
            }`}
            disabled={submitting}
          />

          <div className="flex items-center justify-between flex-wrap gap-2">
            {isStaff ? (
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900">
                <input
                  id="internal-comment-checkbox"
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Internal Note (Hidden from student)</span>
                </span>
              </label>
            ) : (
              <span className="text-[11px] text-slate-400">
                Your comment will be visible to campus technicians and admins.
              </span>
            )}

            <button
              id="submit-comment-button"
              type="submit"
              disabled={submitting || !message.trim()}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isInternal
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInternal ? 'Post Internal Note' : 'Post Comment'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
