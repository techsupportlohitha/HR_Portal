-- Store the seven shared ratings separately for each reviewer.
ALTER TYPE "ReviewPeriod" ADD VALUE IF NOT EXISTS 'MONTHLY';

ALTER TABLE "performance_reviews"
  ADD COLUMN "selfMetricRatings" JSONB,
  ADD COLUMN "managerMetricRatings" JSONB,
  ADD COLUMN "hrMetricRatings" JSONB;
