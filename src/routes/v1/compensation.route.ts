import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import {
  compensationBookingController,
  compensationBookingValidation,
} from '../../modules/compensationBooking';

const router: Router = express.Router();

router
  .route('/available-classes')
  .get(
    auth('getCompensationBookings'),
    validate(compensationBookingValidation.listAvailableClasses),
    compensationBookingController.listAvailableClasses
  );

router
  .route('/classes/:classId/availability')
  .get(
    auth('getCompensationBookings'),
    validate(compensationBookingValidation.getClassAvailability),
    compensationBookingController.getClassAvailability
  );

router
  .route('/bookings')
  .post(
    auth('manageCompensationBookings'),
    validate(compensationBookingValidation.createBooking),
    compensationBookingController.createBooking
  )
  .get(
    auth('getCompensationBookings'),
    validate(compensationBookingValidation.getBookings),
    compensationBookingController.getBookings
  );

router
  .route('/bookings/:bookingId')
  .get(
    auth('getCompensationBookings'),
    validate(compensationBookingValidation.getBooking),
    compensationBookingController.getBooking
  );

router
  .route('/bookings/:bookingId/cancel')
  .post(
    auth('manageCompensationBookings'),
    validate(compensationBookingValidation.cancelBooking),
    compensationBookingController.cancelBooking
  );

export default router;
