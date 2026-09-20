/**
 * WingGap Physical Grid Specifications & Constants
 * Status: LOCKED
 *
 * All physical dimensions are in millimeters (mm).
 */

export const TARGET_PITCH_MM = 45.0;
export const GUIDANCE_CLEAR_GAP_MM = 50.8;
export const DOT_DIAMETER_MM = 6.35;
export const MIN_PANE_DIMENSION_MM = 100.0;
export const MAX_PANE_DIMENSION_MM = 3000.0;

export interface Marker {
  id: string;
  row: number;
  col: number;
  xMm: number;
  yMm: number;
  diameterMm: number;
}

export interface GridSpec {
  paneWidthMm: number;
  paneHeightMm: number;
  targetPitchMm: number;
  guidanceClearGapMm: number;
  dotDiameterMm: number;
  rows: number;
  columns: number;
}

export interface GeneratedPlan {
  spec: GridSpec;
  markers: Marker[];
}

export type ValidationIssueCode =
  | "INVALID_DIMENSIONS"
  | "NON_FINITE_INPUT"
  | "OUT_OF_BOUNDS_DIMENSION"
  | "EMPTY_PLAN"
  | "UNDERSIZED_MARKER"
  | "MARKER_OUT_OF_PANE"
  | "DUPLICATE_CELL"
  | "OFF_GRID_MARKER"
  | "MISSING_CELL"
  | "FULL_ROW_MISSING"
  | "FULL_COLUMN_MISSING"
  | "TARGET_PITCH_EXCEEDED"
  | "GUIDANCE_CLEAR_GAP_EXCEEDED"
  | "GUIDANCE_BOUNDARY_CLEARANCE_EXCEEDED";

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
  row?: number;
  col?: number;
  markerId?: string;
  value?: number;
  threshold?: number;
}

export interface ValidationResult {
  supported: boolean;
  targetMet: boolean;
  guidanceCheckMet: boolean;

  maxCenterPitchXmm: number;
  maxCenterPitchYmm: number;

  maxClearGapXmm: number;
  maxClearGapYmm: number;

  maxBoundaryClearanceXmm: number;
  maxBoundaryClearanceYmm: number;

  issues: ValidationIssue[];
}
