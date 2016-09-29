/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

export class VideoHandler {

  static handle (youtubeVideoElement) {
    var youtubeId = youtubeVideoElement &&
        youtubeVideoElement.getAttribute('data-youtube-id');
    var playingVideo = document.querySelector('iframe');
    var link = youtubeVideoElement &&
        youtubeVideoElement.querySelector('a');

    if (playingVideo) {
      var playingVideoContainer = playingVideo.parentNode;

      // Already playing this video, remove PIP.
      if (youtubeId && playingVideo.src.indexOf(youtubeId) > 0) {
        console.log('Already playing this video, remove PIP');

        playingVideoContainer.classList.remove('youtube-video-player--pip');
        playingVideoContainer.removeAttribute('style');
      } else if (youtubeId) {
        // Different video, embed the link...
        console.log('Different video, embed the link.');
        VideoHandler.embedLink(youtubeId, link);
      } else if (playingVideoContainer.classList.contains('youtube-video-player--pip')) {
        // Already PIP, remove any other players.
        console.log('Already PIP, remove any other players.');
        VideoHandler._removeVideoPlayers(playingVideoContainer.dataset.youtubeId);
      }
    } else if (youtubeVideoElement) {
      // Embed the link to the new video...
      console.log('Embed the link to the new video.');
      VideoHandler.embedLink(youtubeId, link);
    } else {
      // Dismiss video.
      console.log('Dismiss video');
      VideoHandler._removeVideoPlayers();
    }
  }

  static setPictureInPictureIfNeeded () {
    var playingVideo = document.querySelector('iframe');
    if (!playingVideo) {
      return;
    }

    var playingVideoContainer = playingVideo.parentNode;

    playingVideoContainer.classList.add('youtube-video-player--pip');
    playingVideoContainer.style.position = 'fixed';
    playingVideoContainer.style.bottom = '24px';
    playingVideoContainer.style.right = '24px';
    playingVideoContainer.style.left = 'auto';
    playingVideoContainer.style.top = 'auto';
    playingVideoContainer.style.transform = 'scale(0.4)';
    playingVideoContainer.style.transformOrigin = '100% 100%';
  }

  static _removeVideoPlayers (youtubeIdToRetain) {
    var videoPlayers = document.querySelectorAll('.youtube-video-player');
    for (var i = 0; i < videoPlayers.length; i++) {
      if (videoPlayers[i].dataset.youtubeId === youtubeIdToRetain) {
        continue;
      }

      videoPlayers[i].parentNode.removeChild(videoPlayers[i]);
    }
  }

  static _getVideoPlayer (youtubeId) {
    console.log('getting video player for ' + youtubeId);
    var masthead = document.querySelector('.masthead');
    var videoPlayer = document.querySelector(
        '.youtube-video-player[data-youtube-id="' + youtubeId + '"]');

    if (videoPlayer) {
      videoPlayer.innerHTML = '';
    } else {
      videoPlayer = document.createElement('div');
      videoPlayer.classList.add('youtube-video-player');
      videoPlayer.dataset.youtubeId = youtubeId;
      masthead.parentNode.insertBefore(videoPlayer, masthead);
    }

    return videoPlayer;
  }

  static embedLink (youtubeId, link) {
    var videoPlayer = VideoHandler._getVideoPlayer(youtubeId);

    if (!link) {
      console.warn('Expected link for ', youtubeId);
      return;
    }
    /**
     * <a title="Play video of A Million Ways to Argue Over Minutiae" class="youtube-video-player__thumb" href="https://www.youtube.com/watch?v=qDJAz3IIq18">
    <img role="presentation" src="http://img.youtube.com/vi/qDJAz3IIq18/0.jpg" alt="A Million Ways to Argue Over Minutiae">
  </a>
     */

    videoPlayer.appendChild(link);
  }

  static beginPlayback (youtubeURL) {
    var youtubeId = /\?v=([^\/&]+)/.exec(youtubeURL)[1];
    var videoPlayer = VideoHandler._getVideoPlayer(youtubeId);
    var iframe = document.createElement('iframe');

    iframe.classList.add('youtube-video-player__thumb');
    iframe.src = 'https://www.youtube.com/embed/' + youtubeId + '?autoplay=1';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');

    videoPlayer.appendChild(iframe);

    VideoHandler._removeVideoPlayers(youtubeId);
  }
}
