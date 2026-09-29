-- Ràng buộc nghiệp vụ bổ sung, không phụ thuộc giao diện.
CREATE UNIQUE INDEX "one_active_subscription" ON "Subscription" ("userId") WHERE "status" = 'active';
CREATE UNIQUE INDEX "one_scheduled_coach_slot" ON "Booking" ("coachId", "start") WHERE "status" = 'scheduled';
ALTER TABLE "Plan" ADD CONSTRAINT "no_self_parent" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "Price" ADD CONSTRAINT "non_negative_price" CHECK ("amount" >= 0);
ALTER TABLE "Allocation" ADD CONSTRAINT "non_negative_allocation" CHECK ("quantity" >= 0 AND "end" > "start");
ALTER TABLE "Usage" ADD CONSTRAINT "valid_usage_status" CHECK ("status" IN ('reserved','consumed','released'));
ALTER TABLE "Video" ADD CONSTRAINT "positive_duration" CHECK ("duration" > 0);
ALTER TABLE "Progress" ADD CONSTRAINT "non_negative_position" CHECK ("position" >= 0);
ALTER TABLE "User" ADD CONSTRAINT "valid_role" CHECK ("role" IN ('member','coach','admin'));
CREATE FUNCTION check_plan_cycle() RETURNS trigger AS $$
DECLARE cycle_found boolean;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT "id", "parentId" FROM "Plan" WHERE "id" = NEW."parentId"
    UNION SELECT p."id", p."parentId" FROM "Plan" p JOIN ancestors a ON p."id" = a."parentId"
  ) SELECT EXISTS(SELECT 1 FROM ancestors WHERE "id" = NEW."id") INTO cycle_found;
  IF cycle_found THEN RAISE EXCEPTION 'Plan inheritance cycle'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER plan_cycle AFTER INSERT OR UPDATE ON "Plan" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_plan_cycle();
CREATE FUNCTION check_usage_exclusivity() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Review" r JOIN "Booking" b ON r."usageId" = b."usageId" WHERE r."usageId" = NEW."usageId") THEN
    RAISE EXCEPTION 'A benefit usage cannot back both a review and a booking';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER review_usage_exclusive AFTER INSERT OR UPDATE ON "Review" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_usage_exclusivity();
CREATE CONSTRAINT TRIGGER booking_usage_exclusive AFTER INSERT OR UPDATE ON "Booking" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_usage_exclusivity();
