import { ChangeEvent, useEffect, useState } from "react";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  maxSize = 5 * 1024 * 1024;

export function validateCoachImage(file: File) {
  if (!allowedTypes.includes(file.type))
    return "Ảnh phải là tệp JPEG, PNG hoặc WebP.";
  if (file.size > maxSize) return "Ảnh không được vượt quá 5 MiB.";
  return "";
}

export function ImageInput({
  current,
  required = false,
}: {
  current?: string;
  required?: boolean;
}) {
  const [preview, setPreview] = useState(current || ""),
    [error, setError] = useState("");

  useEffect(() => setPreview(current || ""), [current]);
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function change(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    if (!file) {
      setPreview(current || "");
      return;
    }
    const problem = validateCoachImage(file);
    if (problem) {
      setError(problem);
      event.target.value = "";
      setPreview(current || "");
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="image-input">
      <div className="image-preview">
        {preview ? (
          <img src={preview} alt="Xem trước ảnh hồ sơ coach" />
        ) : (
          <span>Chưa có ảnh</span>
        )}
      </div>
      <label>
        {current ? "Thay ảnh hồ sơ" : "Ảnh hồ sơ"}
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={required}
          onChange={change}
        />
      </label>
      <p className="form-hint">JPEG, PNG hoặc WebP · tối đa 5 MiB.</p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
