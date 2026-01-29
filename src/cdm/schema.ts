import { z } from "zod";

/**
 * CDM Table Level specification schema
 */
export const CdmTableSchema = z.object({
  cdmTableName: z.string(),
  schema: z.enum(["CDM", "VOCAB", "RESULTS"]),
  isRequired: z.boolean(),
  conceptPrefix: z.string().nullable(),
  measurePersonCompleteness: z.boolean(),
  measurePersonCompletenessThreshold: z.number().nullable(),
  validation: z.string().nullable(),
  tableDescription: z.string(),
  userGuidance: z.string().nullable(),
  etlConventions: z.string().nullable(),
});

export type CdmTable = z.infer<typeof CdmTableSchema>;

/**
 * CDM Field Level specification schema
 */
export const CdmFieldSchema = z.object({
  cdmTableName: z.string(),
  cdmFieldName: z.string(),
  isRequired: z.boolean(),
  cdmDatatype: z.string(),
  userGuidance: z.string().nullable(),
  etlConventions: z.string().nullable(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  fkTableName: z.string().nullable(),
  fkFieldName: z.string().nullable(),
  fkDomain: z.string().nullable(),
  fkClass: z.string().nullable(),
  uniqueDQIdentifiers: z.string().nullable(),
});

export type CdmField = z.infer<typeof CdmFieldSchema>;

/**
 * CDM Table with its fields schema
 */
export const CdmTableWithFieldsSchema = CdmTableSchema.extend({
  fields: z.array(CdmFieldSchema),
});

export type CdmTableWithFields = z.infer<typeof CdmTableWithFieldsSchema>;
