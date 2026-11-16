-- Recria farms_pricing_check null-safe: no 0021 um modo nulo deixava passar preço pedido ou o conjunto de sacas completo. Tabela vazia em todos os ambientes; o release anterior não grava precificação.
ALTER TABLE "farms" DROP CONSTRAINT "farms_pricing_check";--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_pricing_check" CHECK ((
        "farms"."pricing_mode" is null
        and "farms"."asking_price" is null and "farms"."valuation_bags" is null and "farms"."valuation_bags_unit" is null
        and "farms"."valuation_bags_alqueire_type" is null and "farms"."valuation_crop_id" is null
      ) or (
        "farms"."pricing_mode" is not null and "farms"."pricing_mode" = 'brl'
        and "farms"."asking_price" is not null and "farms"."valuation_bags" is null and "farms"."valuation_bags_unit" is null
        and "farms"."valuation_bags_alqueire_type" is null and "farms"."valuation_crop_id" is null
      ) or (
        "farms"."pricing_mode" is not null and "farms"."pricing_mode" = 'bags'
        and "farms"."asking_price" is null and "farms"."valuation_bags" is not null and "farms"."valuation_bags_unit" is not null
        and "farms"."valuation_crop_id" is not null
        and (("farms"."valuation_bags_unit" = 'per_alqueire') = ("farms"."valuation_bags_alqueire_type" is not null))
      ));