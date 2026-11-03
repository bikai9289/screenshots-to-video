'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Loader2, Paperclip, Sparkles, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

import { ensureClientUser, useSession } from '@/core/auth/client';
import {
  isUploadUnauthorized,
  resolveUploadImageErrorMessage,
} from '@/lib/upload-image-error';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { QuickAuthModal } from '@/components/sites/creation/QuickAuthModal';
import { Button } from '@/components/ui/button';

export function HeroInput() {
  const { data: session } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const handleRequestImage = async () => {
    const user = await ensureClientUser(session?.user);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = await ensureClientUser(session?.user);
    if (!user) {
      setShowAuthModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(m['stp.common.image_format_unsupported']());
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(m['stp.common.image_size_limit_exceeded']());
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const json = await res.json();
      const uploadedUrl = json.data?.urls?.[0] || json.data?.url || '';
      if (!res.ok || json.code === -1 || !uploadedUrl) {
        if (isUploadUnauthorized(json.message, res.status)) {
          setShowAuthModal(true);
          return;
        }
        throw new Error(resolveUploadImageErrorMessage(json.message));
      }
      setUploadedImageUrl(uploadedUrl);
    } catch (err: any) {
      setUploadedImageUrl('');
      if (
        err.message?.toLowerCase().includes('unauthorized') ||
        err.message?.includes('未登录')
      ) {
        setShowAuthModal(true);
      } else {
        toast.error(
          resolveUploadImageErrorMessage(err.message) ||
            m['stp.common.image_upload_failed']()
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const [authCallbackUrl, setAuthCallbackUrl] = useState('/ai-video-generator');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(
        'nanobanana_joyflix_pending_generation_draft'
      );
      if (raw) {
        const draft = JSON.parse(raw);
        if (Date.now() - (draft.createdAt || 0) < 30 * 60 * 1000) {
          if (draft.prompt) setPrompt(draft.prompt);
          if (draft.imagePreview || draft.startImageUrl || draft.image) {
            const img =
              draft.imagePreview || draft.startImageUrl || draft.image;
            setImagePreview(img);
            setUploadedImageUrl(draft.startImageUrl || draft.image || '');
          }
        }
      }
    } catch {}
  }, []);

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadedImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async (target: 'video' | 'image' = 'video') => {
    const trimmed = prompt.trim();

    if (!trimmed && !selectedImage && !uploadedImageUrl) {
      toast.error(m['app.generator.prompt_required']());
      return;
    }
    if (isUploading) return;
    if (selectedImage && !uploadedImageUrl) {
      toast.error('Image upload failed');
      return;
    }

    const uploadedUrl = uploadedImageUrl;

    if (!session?.user) {
      try {
        const draft = {
          generationRequested: true,
          prompt: trimmed,
          target,
          mode:
            target === 'video'
              ? uploadedUrl
                ? 'image-to-video'
                : 'text-to-video'
              : uploadedUrl
                ? 'image-to-image'
                : 'text-to-image',
          imagePreview: imagePreview || uploadedUrl || '',
          startImageUrl: uploadedUrl || '',
          image: uploadedUrl || '',
          createdAt: Date.now(),
        };
        sessionStorage.setItem(
          'nanobanana_joyflix_pending_generation_draft',
          JSON.stringify(draft)
        );
      } catch (err) {
        console.warn('Failed to save draft:', err);
      }
      setAuthCallbackUrl(
        target === 'video' ? '/ai-video-generator' : '/ai-image-generator'
      );
      setShowAuthModal(true);
      return;
    }

    if (target === 'video') {
      navigate({
        to: '/ai-video-generator',
        search: {
          prompt: trimmed,
          startImageUrl: uploadedUrl || undefined,
          model: undefined,
        },
      });
    } else {
      navigate({
        to: '/ai-image-generator',
        search: {
          prompt: trimmed,
          image: uploadedUrl || undefined,
          model: undefined,
        },
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-2 sm:px-0">
      <div className="bg-card/85 border-border/80 focus-within:border-primary/50 focus-within:ring-primary/20 relative rounded-2xl border p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:ring-2 sm:p-3">
        {/* Selected Image Preview Pill */}
        {imagePreview && (
          <div className="bg-muted/60 mb-2 flex w-fit items-center gap-2 rounded-xl p-1.5 pr-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg sm:h-10 sm:w-10">
              <img
                src={imagePreview}
                alt="Reference"
                className="h-full w-full object-cover"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-foreground max-w-[140px] truncate text-xs font-medium sm:max-w-[200px]">
                {selectedImage?.name}
              </span>
              {isUploading && (
                <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Loader2 className="text-primary size-2.5 animate-spin" />
                  {m['stp.common.uploading']?.() || 'Uploading...'}
                </span>
              )}
            </div>
            <button
              onClick={handleRemoveImage}
              disabled={isUploading}
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors',
                isUploading && 'cursor-not-allowed opacity-50'
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Prompt Input Area */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={m['app.generator.prompt_placeholder']()}
          rows={2}
          className="text-foreground placeholder:text-muted-foreground w-full resize-none bg-transparent px-2.5 py-1 text-xs focus:outline-none sm:text-sm"
        />

        {/* Action Toolbar */}
        <div className="border-border/40 mt-2 flex flex-col gap-2 border-t px-1 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void handleRequestImage();
              }}
              className="text-muted-foreground hover:text-foreground h-8 gap-1.5 rounded-lg px-2 text-xs"
            >
              <Paperclip className="size-3.5" />
              <span>{m['app.generator.reference_image']()}</span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => handleGenerate('image')}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
            >
              <Sparkles className="size-3 text-amber-500" />
              <span>{m['app.generator.generate_image_btn']()}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isUploading}
              onClick={() => handleGenerate('video')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-md"
            >
              <Wand2 className="size-3.5" />
              <span>
                {isUploading
                  ? m['app.generator.generating']()
                  : m['app.generator.generate_video_btn']()}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <QuickAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        callbackUrl={authCallbackUrl}
      />
    </div>
  );
}
