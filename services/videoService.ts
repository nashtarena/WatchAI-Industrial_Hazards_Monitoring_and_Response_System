import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { formatBytes } from '../lib/format';
import { SelectedVideo, VideoPickResult } from '../types/video';
import { isSupportedVideo } from './geminiService';

/**
 * Opens the system picker and verifies the chosen file before handing it back.
 * Selection never starts an analysis - the operator must tap Analyze Safety.
 */
export async function pickVideo(): Promise<VideoPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return { ok: false, code: 'CANCELLED', message: 'Video selection cancelled.' };
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? '';

    if (!isSupportedVideo(asset.name, mimeType)) {
      return {
        ok: false,
        code: 'UNSUPPORTED_TYPE',
        message: `"${asset.name}" is not a supported video. Select an MP4 or MOV clip.`,
      };
    }

    let size = asset.size ?? 0;
    let resolvedMime = mimeType;

    if (Platform.OS === 'web') {
      // The web picker returns a browser File plus a blob: URL, not a filesystem path.
      if (asset.file) {
        if (asset.file.size > 0) size = asset.file.size;
        if (!resolvedMime && asset.file.type) resolvedMime = asset.file.type;
      }
    } else {
      try {
        const file = new File(asset.uri);
        if (!file.exists) {
          return {
            ok: false,
            code: 'FILE_MISSING',
            message: 'The selected video could not be opened from storage.',
          };
        }
        if (file.size > 0) size = file.size;
        if (!resolvedMime && file.type) resolvedMime = file.type;
      } catch {
        return {
          ok: false,
          code: 'FILE_MISSING',
          message: 'The selected video could not be verified on this device.',
        };
      }
    }

    const video: SelectedVideo = {
      uri: asset.uri,
      name: asset.name,
      mimeType: resolvedMime || 'video/mp4',
      size,
      sizeLabel: formatBytes(size),
    };

    return { ok: true, video };
  } catch {
    return {
      ok: false,
      code: 'UNKNOWN',
      message: 'The file picker could not be opened. Try again.',
    };
  }
}
