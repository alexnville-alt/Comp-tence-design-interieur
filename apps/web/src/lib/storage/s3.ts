import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Client S3-compatible (ADR-0008) : MinIO en développement, Cloudflare R2 en
 * production — même code, seule la configuration change.
 *
 * `forcePathStyle: true` : MinIO (et la plupart des S3-compatibles hors AWS)
 * n'a pas de résolution DNS par sous-domaine de bucket ; sans cette option,
 * le client tenterait `bucket.endpoint` au lieu de `endpoint/bucket` et
 * échouerait en développement.
 */
const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  // Le SDK v3 ajoute par défaut un en-tête/paramètre de somme de contrôle
  // (crc32) à chaque requête signée. MinIO et R2 le gèrent, mais ça élargit
  // la liste des en-têtes soumis au contrôle CORS du navigateur lors d'un
  // dépôt direct (ADR-0008) sans bénéfice ici : le SHA-256 calculé côté
  // serveur après téléchargement (`processUploadedImage`) sert déjà à la
  // fois d'intégrité et de déduplication.
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

/** ADR-0008 : URL de dépôt présignée, valable 5 minutes. */
const UPLOAD_URL_TTL_SECONDS = 5 * 60;
/** ADR-0008 : URL de lecture présignée, valable 10 minutes — jamais plus, pour limiter la fenêtre si elle fuit. */
const READ_URL_TTL_SECONDS = 10 * 60;

export function createUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

/** Jamais d'URL d'objet directe (ADR-0008) : toujours représignée à la demande, après vérification de propriété. */
export function createReadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: READ_URL_TTL_SECONDS });
}

/** Télécharge un objet côté serveur — pour le traitement (EXIF, redimensionnement), jamais pour le relayer au client. */
export async function getObjectBytes(key: string): Promise<Buffer> {
  const result = await client.send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );
  if (!result.Body) throw new Error(`Objet S3 introuvable ou vide : ${key}`);
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function putObjectBytes(
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
