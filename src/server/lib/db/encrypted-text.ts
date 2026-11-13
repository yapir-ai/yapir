import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { customType } from "drizzle-orm/pg-core";

const algorithm = "aes-256-gcm";
const ivLength = 12;
const tagEnd = ivLength + 16;

// Read when a value is written or read: generating migrations does not need it.
const encryptionKey = () => Buffer.from(process.env.ENCRYPTION_KEY, "base64");

// Stores base64(iv ‖ tag ‖ ciphertext), encrypted with AES-256-GCM under ENCRYPTION_KEY.
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => {
    const iv = randomBytes(ivLength);
    const cipher = createCipheriv(algorithm, encryptionKey(), iv);

    const ciphertext = Buffer.concat([
      cipher.update(value, "utf-8"),
      cipher.final(),
    ]);

    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      "base64"
    );
  },
  fromDriver: (value) => {
    const data = Buffer.from(value, "base64");

    const decipher = createDecipheriv(
      algorithm,
      encryptionKey(),
      data.subarray(0, ivLength)
    );

    decipher.setAuthTag(data.subarray(ivLength, tagEnd));

    return Buffer.concat([
      decipher.update(data.subarray(tagEnd)),
      decipher.final(),
    ]).toString();
  },
});
