import express, { Router } from 'express';
import authRoute from './auth.route';
import docsRoute from './swagger.route';
import userRoute from './user.route';
import moduleRoute from './module.route';
import courseRoute from './course.route';   
import syllabusRoute from './syllabus.route';
import classesRoute from './classes.route';
import config from '../../config/config';
import studentProgressRoute from './studentProgress.route';
import studentAttendanceRoute from './studentAttendance.route';

const router = express.Router();

interface IRoute {
  path: string;
  route: Router;
}

const defaultIRoute: IRoute[] = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/modules',
    route: moduleRoute,
  },
  {
    path: '/courses',
    route: courseRoute,
  },
  {
    path: '/syllabi',
    route: syllabusRoute,
  },
  {
    path: '/classes',
    route: classesRoute,
  },
  {
    path: '/student-progress',
    route: studentProgressRoute,
  },
  {
    path: '/student-attendance',
    route: studentAttendanceRoute,
  },
];

const devIRoute: IRoute[] = [
  // IRoute available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultIRoute.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devIRoute.forEach((route) => {
    router.use(route.path, route.route);
  });
}

export default router;
