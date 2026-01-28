/**
 * CDM Table Level specification
 */
export interface CdmTable {
  cdmTableName: string;
  schema: "CDM" | "VOCAB" | "RESULTS";
  isRequired: boolean;
  conceptPrefix: string | null;
  measurePersonCompleteness: boolean;
  measurePersonCompletenessThreshold: number | null;
  validation: string | null;
  tableDescription: string;
  userGuidance: string | null;
  etlConventions: string | null;
}

/**
 * CDM Field Level specification
 */
export interface CdmField {
  cdmTableName: string;
  cdmFieldName: string;
  isRequired: boolean;
  cdmDatatype: string;
  userGuidance: string | null;
  etlConventions: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  fkTableName: string | null;
  fkFieldName: string | null;
  fkDomain: string | null;
  fkClass: string | null;
  uniqueDQIdentifiers: string | null;
}

/**
 * CDM Table with its fields
 */
export interface CdmTableWithFields extends CdmTable {
  fields: CdmField[];
}
