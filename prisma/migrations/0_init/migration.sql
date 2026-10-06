-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Sex" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "public"."BarcodeType" AS ENUM ('PDF417', 'CODE128');

-- CreateTable
CREATE TABLE "public"."Barcode" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "public"."BarcodeType" NOT NULL,
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "editFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "DAG" TEXT NOT NULL,
    "DAI" TEXT NOT NULL,
    "DAJ" TEXT NOT NULL,
    "DAK" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Names" (
    "id" TEXT NOT NULL,
    "DAC" TEXT NOT NULL,
    "DAD" TEXT NOT NULL,
    "DCS" TEXT NOT NULL,
    "DBC" "public"."Sex" NOT NULL,

    CONSTRAINT "Names_pkey" PRIMARY KEY ("id")
);

