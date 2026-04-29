import crypto from "node:crypto";

export function computeHash(buffer: Buffer, algorithm: "sha256" | "md5" = "sha256"): string {
  return crypto.createHash(algorithm).update(buffer).digest("hex");
}
