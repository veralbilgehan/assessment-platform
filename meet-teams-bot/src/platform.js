'use strict';

function linkTipiTespitEt(link) {
  let url;
  try {
    url = new URL(link);
  } catch (err) {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host.includes('meet.google.com')) return 'meet';
  if (host.includes('teams.microsoft.com') || host.includes('teams.live.com')) return 'teams';
  return null;
}

module.exports = { linkTipiTespitEt };
