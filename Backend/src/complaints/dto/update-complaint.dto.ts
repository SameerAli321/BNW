import { CreateComplaintDto } from './create-complaint.dto';

/**
 * PATCH /complaints/:id — the complainant (or HR / Admin) edits it until HR responds. Every field
 * of CreateComplaintDto is already optional; anything left out keeps its value, '' clears it.
 */
export class UpdateComplaintDto extends CreateComplaintDto {}
