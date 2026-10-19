"use client";

import * as React from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { RECEIPT_ALLOWED_TYPES, RECEIPT_MAX_BYTES } from "@/lib/constants";
import { deleteReceiptAction, uploadReceiptAction } from "@/lib/actions/receipts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { ReceiptPreview } from "@/components/transactions/receipt-preview";

export function ReceiptUploader({ transactionId, receiptPath }: { transactionId: string; receiptPath: string | null }) {
  const [path, setPath] = React.useState<string | null>(receiptPath);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewKey, setPreviewKey] = React.useState(0);

  // Revoke object URLs when they are replaced or the component unmounts.
  React.useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!(RECEIPT_ALLOWED_TYPES as readonly string[]).includes(f.type)) {
      setError("Only JPEG, PNG, WebP images or PDF files are allowed.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (f.size > RECEIPT_MAX_BYTES) {
      setError("Receipts must be 5 MB or smaller.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const upload = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const r = await uploadReceiptAction(transactionId, fd);
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      setPath(r.data.path);
      setFile(null);
      setPreviewUrl(null);
      setPreviewKey((k) => k + 1);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(r.message ?? "Receipt uploaded.");
    });
  };

  const remove = async () => {
    const r = await deleteReceiptAction(transactionId);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setPath(null);
    toast.success(r.message ?? "Receipt removed.");
  };

  return (
    <div className="mt-2 flex flex-col gap-3">
      {path ? (
        <div className="flex flex-col gap-2">
          <ReceiptPreview key={previewKey} transactionId={transactionId} compact />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
              <Upload data-icon="inline-start" /> Replace
            </Button>
            <ConfirmationDialog
              trigger={
                <Button type="button" variant="destructive" size="sm" disabled={pending}>
                  <Trash2 data-icon="inline-start" /> Remove
                </Button>
              }
              title="Remove this receipt?"
              description="The file will be permanently deleted from your private storage."
              confirmLabel="Remove receipt"
              destructive
              onConfirm={remove}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No receipt attached.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ALLOWED_TYPES.join(",")}
        onChange={onChoose}
        className="sr-only"
        id={`receipt-file-${transactionId}`}
        aria-label="Choose receipt file"
      />
      {!path ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => inputRef.current?.click()} disabled={pending}>
          <Paperclip data-icon="inline-start" /> Choose file
        </Button>
      ) : null}

      {file ? (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Selected receipt preview" className="size-16 rounded-md object-cover" />
            ) : (
              <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{file.name}</div>
              <div className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={upload} disabled={pending}>
              {pending ? <Spinner /> : <Upload data-icon="inline-start" />}
              {pending ? "Uploading…" : path ? "Upload replacement" : "Upload"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setFile(null); setPreviewUrl(null); if (inputRef.current) inputRef.current.value = ""; }} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
