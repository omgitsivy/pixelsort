import { luminance, saturation, hue } from './colorUtils';

type Pixel = [number, number, number];
type SortFunction = (pixel: Pixel) => number;

function randomExclude(
  pixels: Pixel[],
  lower: number,
  upper: number
): Pixel[][] {
  const chunks: Pixel[][] = [];
  let group: Pixel[] = [];

  for (const pixel of pixels) {
    const num = Math.random();
    if (num < lower || num > upper) {
      if (group.length > 0) {
        chunks.push([...group]);
        group = [];
      }
      chunks.push([pixel]);
    } else {
      group.push(pixel);
    }
  }

  if (group.length > 0) {
    chunks.push(group);
  }

  return chunks;
}

function hslExclude(
  pixels: Pixel[],
  excludeFunc: SortFunction,
  lower: number,
  upper: number
): Pixel[][] {
  const chunks: Pixel[][] = [];
  let group: Pixel[] = [];

  for (const pixel of pixels) {
    const val = excludeFunc(pixel);
    if (val < lower || val > upper) {
      if (group.length > 0) {
        chunks.push([...group]);
        group = [];
      }
      chunks.push([pixel]);
    } else {
      group.push(pixel);
    }
  }

  if (group.length > 0) {
    chunks.push(group);
  }

  return chunks;
}

export function pixelSort(
  imageData: ImageData,
  sortAlgorithm: string,
  excludeAlgorithm: string,
  intensity: number,
  interval: number,
  direction: 'horizontal' | 'vertical'
): ImageData {
  const { width, height, data } = imageData;
  const sortedData = new Uint8ClampedArray(data);

  const getSortFunc = (funcName: string): SortFunction => {
    switch (funcName) {
      case 'lightness':
      case 'lightness_threshold':
        return luminance;
      case 'saturation':
      case 'saturation_threshold':
        return saturation;
      case 'hue':
      case 'hue_threshold':
        return hue;
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
  };

  const sortFunc = getSortFunc(sortAlgorithm);
  const excludeFunc = excludeAlgorithm === 'random_exclude' ? null : getSortFunc(excludeAlgorithm);

  // Adjust thresholds based on intensity
  const lowerThreshold = 0.5 - (intensity * 0.5);
  const upperThreshold = 0.5 + (intensity * 0.5);

  const sortChunk = (chunk: Pixel[]): Pixel[] => {
    if (chunk.length > 1) {
      // Apply intensity to sorting
      const sortedChunk = chunk.sort((a, b) => sortFunc(a) - sortFunc(b));
      const chunkLength = sortedChunk.length;
      const intensityAdjustedLength = Math.floor(chunkLength * intensity);
      
      // Keep a portion of the sorted chunk based on intensity
      const keptSorted = sortedChunk.slice(0, intensityAdjustedLength);
      const remainingUnsorted = sortedChunk.slice(intensityAdjustedLength);
      
      return [...keptSorted, ...remainingUnsorted];
    }
    return chunk;
  };

  const processLine = (line: Pixel[]): Pixel[] => {
    const chunks = excludeAlgorithm === 'random_exclude'
      ? randomExclude(line, lowerThreshold, upperThreshold)
      : hslExclude(line, excludeFunc!, lowerThreshold, upperThreshold);

    // Sort each chunk separately
    return chunks.flatMap(sortChunk);
  };

  const chunkSize = Math.max(1, Math.floor(interval * (direction === 'horizontal' ? width : height) / 100));

  const processLines = (getLine: (i: number) => Pixel[], setLine: (i: number, line: Pixel[]) => void, lineCount: number) => {
    for (let i = 0; i < lineCount; i++) {
      const line = getLine(i);
      const processedLine: Pixel[] = [];

      for (let j = 0; j < line.length; j += chunkSize) {
        const chunk = line.slice(j, j + chunkSize);
        const sortedChunk = processLine(chunk);
        processedLine.push(...sortedChunk);
      }

      setLine(i, processedLine);
    }
  };

  if (direction === 'vertical') {
    processLines(
      (x) => Array.from({ length: height }, (_, y) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      }),
      (x, column) => {
        column.forEach((pixel, y) => {
          const i = (y * width + x) * 4;
          sortedData[i] = pixel[0];
          sortedData[i + 1] = pixel[1];
          sortedData[i + 2] = pixel[2];
        });
      },
      width
    );
  } else {
    processLines(
      (y) => Array.from({ length: width }, (_, x) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      }),
      (y, row) => {
        row.forEach((pixel, x) => {
          const i = (y * width + x) * 4;
          sortedData[i] = pixel[0];
          sortedData[i + 1] = pixel[1];
          sortedData[i + 2] = pixel[2];
        });
      },
      height
    );
  }

  return new ImageData(sortedData, width, height);
}