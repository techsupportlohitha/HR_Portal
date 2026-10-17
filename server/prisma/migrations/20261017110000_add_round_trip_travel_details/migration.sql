ALTER TABLE "travel_requests"
ADD COLUMN "travelModes" "TravelMode"[] NOT NULL DEFAULT ARRAY[]::"TravelMode"[],
ADD COLUMN "outboundAmountRequired" DECIMAL(65,30),
ADD COLUMN "returnAmountRequired" DECIMAL(65,30);

UPDATE "travel_requests"
SET "travelModes" = ARRAY["travelMode"]
WHERE cardinality("travelModes") = 0;
