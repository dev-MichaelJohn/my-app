import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { OfferingService, type IOfferingService } from "@/services/offering.service.js";
import z from "zod";

export class OfferingController {
  constructor(private offeringService: IOfferingService = new OfferingService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Offering ID provided.");

  getOfferingById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService.getOfferingById(offeringId).map((data) => ({
        status: 200,
        message: "Offering details retrieved successfully.",
        data,
      }));
    });
  });

  getOfferings = runAsync((req) => {
    return this.offeringService.getOfferings(req.query, undefined, req.user).map((data) => ({
      status: 200,
      message: "Offerings retrieved successfully.",
      data,
    }));
  });

  createOffering = runAsync((req) => {
    return this.offeringService.createOffering(req.body, undefined, req.user, req).map((data) => ({
      status: 201,
      message: "Offering created successfully.",
      data,
    }));
  });

  updateOffering = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService
        .updateOffering(offeringId, req.body, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Offering updated successfully.",
          data,
        }));
    });
  });

  deleteOffering = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService.deleteOffering(offeringId, undefined, req.user, req).map(() => ({
        status: 200,
        message: "Offering archived successfully.",
        data: null,
      }));
    });
  });

  restoreOffering = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService
        .restoreOffering(offeringId, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Offering restored successfully.",
          data,
        }));
    });
  });

  generateOfferings = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.semester_id).asyncAndThen((semesterId) => {
      return this.offeringService
        .generateOfferingsForSemester(semesterId, undefined, req.user, req)
        .map((summary) => ({
          status: 200,
          message: summary.message,
          data: summary,
        }));
    });
  });
}
