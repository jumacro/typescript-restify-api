import * as config from 'config';
import * as fb from 'fb';
import { Facebook, FacebookApiException } from 'fb';
import * as jwt from 'jsonwebtoken';
import { logger as log } from '../../../logger';
import * as restify from 'restify';

export const bootstrap = (server: restify.Server) => {

  server.get('/auth/facebook/callback', (req: restify.Request, res: restify.Response) => {
    log.info('Facebook Response: ', req.params);
    res.header('Location', 'http://localhost:4200/about');
    res.send(302);
  });

  // post to exchange fb token for jwt
  server.post('/auth/facebook/token', fbVerify);
};

const fbVerify = (req: restify.Request, res: restify.Response, next: restify.Next): void => {
  log.trace('fbVerify', req.body);

  const fb = new Facebook({
    appId: config.get('OAuthProviders.Facebook.client_id'),
    appSecret: config.get('OAuthProviders.Facebook.client_secret'),
    version: config.get('OAuthProviders.Facebook.apiVersion'),
  });

  fb.api('/me', {
    access_token: req.body.accessToken,
    fields: ['first_name', 'last_name', 'email', 'gender', 'picture.type(large)'],
  }, (fbApiResp: any) => {
    log.debug('facebook.api response ', fbApiResp);

    if (fbApiResp.error) {
      return res.send(503, { reason: 'Failed to access Facebook API' });
    }

    // req.userProfile = UserProfile.fromFacebookProfile(fbApiResp as IFacebookProfile);
    const payload = {
      email: fbApiResp.email,
      firstName: fbApiResp.first_name,
      lastName: fbApiResp.last_name,
      pictureUrl: fbApiResp.picture.data.url,
    };

    const secret = config.get('Server.authSecret') as string;

    const tokenResponse = {
      accessToken: jwt.sign(payload, secret, { subject: fbApiResp.id }),
      expiresIn: 9600,
      tokenType: 'Bearer',
    };

    res.send(200, tokenResponse);
  });

};
