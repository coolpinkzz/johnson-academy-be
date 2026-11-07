import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { ticketController, ticketValidation } from '../../modules/ticket';

const router: Router = express.Router();

router.route('/').post(auth('createTickets'), validate(ticketValidation.createTicket), ticketController.createTicket);

router.route('/').get(auth('getTickets'), validate(ticketValidation.getTickets), ticketController.getTickets);

router.route('/stats').get(auth('manageTickets'), ticketController.getTicketStats);

router.route('/assignees').get(auth('manageTickets'), ticketController.getAssignees);

router.route('/:ticketId').get(auth('getTickets'), validate(ticketValidation.getTicket), ticketController.getTicket);

router
  .route('/:ticketId/assignment')
  .patch(auth('manageTickets'), validate(ticketValidation.updateAssignment), ticketController.updateAssignment);

router
  .route('/:ticketId/status')
  .patch(auth('manageTickets'), validate(ticketValidation.updateStatus), ticketController.updateStatus);

router
  .route('/:ticketId/comments')
  .post(auth('manageTickets'), validate(ticketValidation.addComment), ticketController.addComment);

export default router;
