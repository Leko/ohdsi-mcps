import { z } from "zod";

/**
 * CDM Table Level specification schema
 */
export const cdmTableSchema = z.object({
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

export type CdmTable = z.infer<typeof cdmTableSchema>;

/**
 * CDM Field Level specification schema
 */
export const cdmFieldSchema = z.object({
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

export type CdmField = z.infer<typeof cdmFieldSchema>;

/**
 * CDM Table with its fields schema
 */
export const cdmTableWithFieldsSchema = cdmTableSchema.extend({
  fields: z.array(cdmFieldSchema),
});

export type CdmTableWithFields = z.infer<typeof cdmTableWithFieldsSchema>;
