import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { appVersionValidation } from '../../modules/appVersion';
import * as appVersionController from '../../modules/appVersion/appVersion.controller';
import { appVersionLimiter } from '../../modules/utils';

const router: Router = express.Router();

router
  .route('/check')
  .get(appVersionLimiter, validate(appVersionValidation.checkVersion), appVersionController.checkVersion);

router
  .route('/')
  .post(auth('manageSystem'), validate(appVersionValidation.createAppVersion), appVersionController.createAppVersion)
  .get(auth('manageSystem'), appVersionController.getAppVersions);

router
  .route('/:appVersionId')
  .get(auth('manageSystem'), validate(appVersionValidation.getAppVersion), appVersionController.getAppVersion)
  .patch(auth('manageSystem'), validate(appVersionValidation.updateAppVersion), appVersionController.updateAppVersion)
  .delete(auth('manageSystem'), validate(appVersionValidation.deleteAppVersion), appVersionController.deleteAppVersion);

export default router;

/**
 * @swagger
 * tags:
 *   name: AppVersion
 *   description: Mobile app version check and update policy management
 */

/**
 * @swagger
 * /app-version/check:
 *   get:
 *     summary: Check if the mobile app needs an update
 *     description: Public endpoint called on app launch. Returns soft, hard, maintenance, or no update.
 *     tags: [AppVersion]
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ios, android]
 *       - in: query
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Current app version (semver, e.g. 1.2.0)
 *     responses:
 *       "200":
 *         description: Version check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updateType:
 *                   type: string
 *                   enum: [none, soft, hard, maintenance]
 *                 latestVersion:
 *                   type: string
 *                 minSupportedVersion:
 *                   type: string
 *                 storeUrl:
 *                   type: string
 *                 title:
 *                   type: string
 *                 message:
 *                   type: string
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 */

/**
 * @swagger
 * /app-version:
 *   post:
 *     summary: Create app version config for a platform
 *     description: Only admins can create app version configs.
 *     tags: [AppVersion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - latestVersion
 *               - minSupportedVersion
 *               - storeUrl
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *               latestVersion:
 *                 type: string
 *                 example: "1.3.0"
 *               minSupportedVersion:
 *                 type: string
 *                 example: "1.1.0"
 *               storeUrl:
 *                 type: string
 *                 format: uri
 *               softUpdateTitle:
 *                 type: string
 *               softUpdateMessage:
 *                 type: string
 *               hardUpdateTitle:
 *                 type: string
 *               hardUpdateMessage:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               maintenanceMode:
 *                 type: boolean
 *               maintenanceMessage:
 *                 type: string
 *     responses:
 *       "201":
 *         description: App version config created
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "409":
 *         description: Config for platform already exists
 *
 *   get:
 *     summary: Get all app version configs
 *     description: Only admins can list app version configs.
 *     tags: [AppVersion]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: List of app version configs
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /app-version/{appVersionId}:
 *   get:
 *     summary: Get app version config by ID
 *     tags: [AppVersion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appVersionId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *     responses:
 *       "200":
 *         description: App version config retrieved
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update app version config
 *     tags: [AppVersion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appVersionId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latestVersion:
 *                 type: string
 *               minSupportedVersion:
 *                 type: string
 *               storeUrl:
 *                 type: string
 *               softUpdateTitle:
 *                 type: string
 *               softUpdateMessage:
 *                 type: string
 *               hardUpdateTitle:
 *                 type: string
 *               hardUpdateMessage:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               maintenanceMode:
 *                 type: boolean
 *               maintenanceMessage:
 *                 type: string
 *     responses:
 *       "200":
 *         description: App version config updated
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete app version config
 *     tags: [AppVersion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appVersionId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *     responses:
 *       "204":
 *         description: App version config deleted
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
