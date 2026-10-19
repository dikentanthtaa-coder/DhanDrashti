"use client";

import * as React from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { removeProfilePhotoAction, uploadProfilePhotoAction } from "@/lib/actions/profile-photo";
import { initials } from "@/lib/format";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [pending, startTransition] = React.useTransition();
  const [preview, setPreview] = React.useState<string | null>(avatarUrl);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG or WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photos must be 2 MB or smaller.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    const local = URL.createObjectURL(file);
    startTransition(async () => {
      const r = await uploadProfilePhotoAction(fd);
      if (!r.ok) {
        toast.error(r.error);
        URL.revokeObjectURL(local);
      } else {
        setPreview(local);
        toast.success(r.message ?? "Photo updated.");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const remove = async () => {
    const r = await removeProfilePhotoAction();
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setPreview(null);
    toast.success(r.message ?? "Photo removed.");
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar className="size-20 ring-2 ring-border">
          {preview ? <AvatarImage src={preview} alt="" className="object-cover" /> : null}
          <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">{initials(name) || "U"}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Change profile photo"
        >
          {pending ? <Spinner className="size-4" /> : <Camera className="size-4" />}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <div className="font-medium">Profile photo</div>
          <p className="text-xs text-muted-foreground">Optional. JPEG, PNG or WebP up to 2 MB. Without a photo, your initials are shown.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Camera data-icon="inline-start" /> {preview ? "Change photo" : "Upload photo"}
          </Button>
          {preview ? (
            <ConfirmationDialog
              trigger={
                <Button type="button" size="sm" variant="ghost" disabled={pending}>
                  <Trash2 data-icon="inline-start" /> Remove
                </Button>
              }
              title="Remove your profile photo?"
              description="Your initials will be shown instead."
              confirmLabel="Remove photo"
              destructive
              onConfirm={remove}
            />
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={ALLOWED.join(",")} className="sr-only" onChange={onChoose} aria-label="Choose profile photo" />
    </div>
  );
}
