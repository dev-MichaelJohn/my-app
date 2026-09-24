import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { OfferingService, type IOfferingService } from "@/services/offering.service.js";
import z from "zod";

export class OfferingController {
  constructor(private offeringService: IOfferingService = new OfferingService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Offering ID provided.");

  getOfferingById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService.getOfferingById(offeringId).map((data) => ({
        status: 200,
        message: "Offering details retrieved successfully.",
        data,
      }));
    });
  });

  getOfferings = runAsync((req, _res) => {
    return this.offeringService.getOfferings(req.query).map((data) => ({
      status: 200,
      message: "Offerings retrieved successfully.",
      data,
    }));
  });

  createOffering = runAsync((req, _res) => {
    return this.offeringService.createOffering(req.body).map((data) => ({
      status: 201,
      message: "Offering created successfully.",
      data,
    }));
  });

  updateOffering = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService.updateOffering(offeringId, req.body).map((data) => ({
        status: 200,
        message: "Offering updated successfully.",
        data,
      }));
    });
  });

  deleteOffering = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService.deleteOffering(offeringId).map(() => ({
        status: 200,
        message: "Offering archived successfully.",
        data: null,
      }));
    });
  });

  restoreOffering = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringId) => {
      return this.offeringService.restoreOffering(offeringId).map((data) => ({
        status: 200,
        message: "Offering restored successfully.",
        data,
      }));
    });
  });

  generateOfferings = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.semester_id).asyncAndThen((semesterId) => {
      return this.offeringService.generateOfferingsForSemester(semesterId).map((summary) => ({
        status: 200,
        message: summary.message,
        data: summary,
      }));
    });
  });
}
