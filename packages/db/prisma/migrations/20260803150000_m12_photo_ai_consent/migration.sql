-- M12 : consentement au premier envoi d'une photo au fournisseur IA (docs/01 §9).
ALTER TABLE "Profile" ADD COLUMN "photoAiConsentAt" TIMESTAMP(3);
