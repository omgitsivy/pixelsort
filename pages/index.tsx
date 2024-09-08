import { useState, useRef, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useTheme } from 'next-themes'
import { Container, Flex, Text, Button, Slider, Select, Card, Box, Grid, Progress, Tooltip } from '@radix-ui/themes';
import { UploadIcon, ResetIcon, PlayIcon, SunIcon, MoonIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { pixelSort } from '../utils/pixelSorting';

type HistoryEntry = {
  intensity: number;
  chunkSize: number;
  direction: 'horizontal' | 'vertical';
  sortAlgorithm: string;
  excludeAlgorithm: string;
};

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [image, setImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [chunkSize, setChunkSize] = useState(10);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [sortAlgorithm, setSortAlgorithm] = useState('lightness');
  const [excludeAlgorithm, setExcludeAlgorithm] = useState('lightness_threshold');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
      setProcessedImage(null);
      setPreviewImage(null);
      resetHistory();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setImage(event.dataTransfer.files[0]);
      setProcessedImage(null);
      setPreviewImage(null);
      resetHistory();
    }
  };

  const handleReset = () => {
    setImage(null);
    setProcessedImage(null);
    setPreviewImage(null);
    setIntensity(50);
    setChunkSize(10);
    setDirection('horizontal');
    setSortAlgorithm('lightness');
    setExcludeAlgorithm('lightness_threshold');
    resetHistory();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetHistory = () => {
    setHistory([]);
    setHistoryIndex(-1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setIntensity(prevEntry.intensity);
      setChunkSize(prevEntry.chunkSize);
      setDirection(prevEntry.direction);
      setSortAlgorithm(prevEntry.sortAlgorithm);
      setExcludeAlgorithm(prevEntry.excludeAlgorithm);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1];
      setIntensity(nextEntry.intensity);
      setChunkSize(nextEntry.chunkSize);
      setDirection(nextEntry.direction);
      setSortAlgorithm(nextEntry.sortAlgorithm);
      setExcludeAlgorithm(nextEntry.excludeAlgorithm);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const processImage = useCallback((preview: boolean = false) => {
    if (!image) return;

    const canvas = preview ? previewCanvasRef.current : canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setLoading(true);

    const img = new window.Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const maxWidth = preview ? 300 : img.width;
      const maxHeight = preview ? 300 : img.height;

      let newWidth = maxWidth;
      let newHeight = maxWidth / aspectRatio;

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = maxHeight * aspectRatio;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const sortedImageData = pixelSort(
        imageData,
        sortAlgorithm,
        excludeAlgorithm,
        intensity / 100,
        chunkSize,
        direction
      );

      ctx.putImageData(sortedImageData, 0, 0);
      const dataUrl = canvas.toDataURL();
      if (preview) {
        setPreviewImage(dataUrl);
      } else {
        setProcessedImage(dataUrl);
        const newEntry: HistoryEntry = {
          intensity,
          chunkSize,
          direction,
          sortAlgorithm,
          excludeAlgorithm,
        };
        setHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), newEntry]);
        setHistoryIndex(prevIndex => prevIndex + 1);
      }
      setLoading(false);
    };
    img.src = URL.createObjectURL(image);
  }, [image, intensity, chunkSize, sortAlgorithm, excludeAlgorithm, direction, historyIndex]);

  useEffect(() => {
    if (image) {
      const debounce = setTimeout(() => {
        processImage(true);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [image, intensity, chunkSize, sortAlgorithm, excludeAlgorithm, direction, processImage]);
  
  const downloadImage = (format: 'png' | 'jpeg') => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `processed_image.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <Head>
        <title>Pixel Sorter</title>
        <meta name="description" content="Image pixel sorting application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container size="4">
        <Flex justify="between" align="center" mb="6">
          <Text size="8" weight="bold">Pixel Sorter</Text>
          <Button variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </Button>
        </Flex>

        <Grid columns={{ initial: '1', md: '2' }} gap="6">
          <Box>
            <Card mb="4">
              <Flex align="center" gap="4" wrap="wrap">
                <Box style={{ flexGrow: 1 }}>
                  <Text as="label" size="2" htmlFor="upload-input">
                    Choose an image to sort
                  </Text>
                  <input
                    id="upload-input"
                    type="file"
                    onChange={handleUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                  />
                </Box>
                <Tooltip content="Upload an image">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon /> Upload Image
                  </Button>
                </Tooltip>
                <Tooltip content="Reset all settings">
                  <Button variant="soft" onClick={handleReset}>
                    <ResetIcon /> Reset
                  </Button>
                </Tooltip>
              </Flex>
            </Card>

            <Card>
              <Flex direction="column" gap="4">
                <Text as="label" size="3" weight="bold">
                  Sorting Options
                </Text>
                <Flex direction="column" gap="3">
                  <Tooltip content="Adjust the strength of the sorting effect">
                    <Text as="label" size="2">
                      Intensity: {intensity}%
                    </Text>
                  </Tooltip>
                  <Slider
                    value={[intensity]}
                    onValueChange={(value) => setIntensity(value[0])}
                    min={0}
                    max={100}
                    step={1}
                  />
                </Flex>
                <Flex direction="column" gap="3">
                  <Tooltip content="Set the size of sorted chunks">
                    <Text as="label" size="2">
                      Chunk Size: {chunkSize}%
                    </Text>
                  </Tooltip>
                  <Slider
                    value={[chunkSize]}
                    onValueChange={(value) => setChunkSize(value[0])}
                    min={1}
                    max={100}
                    step={1}
                  />
                </Flex>
                <Flex direction="column" gap="3">
                  <Tooltip content="Choose sorting direction">
                    <Text as="label" size="2">
                      Direction
                    </Text>
                  </Tooltip>
                  <Select.Root value={direction} onValueChange={(value: 'horizontal' | 'vertical') => setDirection(value)}>
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="horizontal">Horizontal</Select.Item>
                      <Select.Item value="vertical">Vertical</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="3">
                  <Tooltip content="Select the algorithm for sorting pixels">
                    <Text as="label" size="2">
                      Sort Algorithm
                    </Text>
                  </Tooltip>
                  <Select.Root value={sortAlgorithm} onValueChange={setSortAlgorithm}>
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="lightness">Lightness</Select.Item>
                      <Select.Item value="saturation">Saturation</Select.Item>
                      <Select.Item value="hue">Hue</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="3">
                  <Tooltip content="Choose how to exclude pixels from sorting">
                    <Text as="label" size="2">
                      Exclude Algorithm
                    </Text>
                  </Tooltip>
                  <Select.Root value={excludeAlgorithm} onValueChange={setExcludeAlgorithm}>
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="lightness_threshold">Lightness Threshold</Select.Item>
                      <Select.Item value="saturation_threshold">Saturation Threshold</Select.Item>
                      <Select.Item value="hue_threshold">Hue Threshold</Select.Item>
                      <Select.Item value="random_exclude">Random Exclude</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex gap="2">
                  <Tooltip content="Apply settings to full image">
                    <Button onClick={() => processImage(false)} disabled={!image}>
                      <PlayIcon /> Apply to Full Image
                    </Button>
                  </Tooltip>
                  <Tooltip content="Undo last change">
                    <Button variant="soft" onClick={undo} disabled={historyIndex <= 0}>
                      <ArrowLeftIcon />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Redo last undone change">
                    <Button variant="soft" onClick={redo} disabled={historyIndex >= history.length - 1}>
                      <ArrowRightIcon />
                    </Button>
                  </Tooltip>
                </Flex>
                {processedImage && (
                  <Flex gap="2">
                    <Tooltip content="Download as PNG">
                      <Button variant="soft" onClick={() => downloadImage('png')}>
                        <DownloadIcon /> PNG
                      </Button>
                    </Tooltip>
                    <Tooltip content="Download as JPEG">
                      <Button variant="soft" onClick={() => downloadImage('jpeg')}>
                        <DownloadIcon /> JPEG
                      </Button>
                    </Tooltip>
                  </Flex>
                )}
              </Flex>
            </Card>
          </Box>

          <Box>
            <Card>
              <Text as="p" size="3" weight="bold" mb="2">
                {processedImage ? 'Processed Image' : (previewImage ? 'Preview' : 'Original Image')}
              </Text>
              <Box
                style={{ maxWidth: '100%', overflow: 'hidden' }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {loading && <Progress />}
                {(image || processedImage || previewImage) ? (
                  <Image
                    src={processedImage || previewImage || (image ? URL.createObjectURL(image) : '')}
                    alt={processedImage ? 'Processed Image' : (previewImage ? 'Preview' : 'Original Image')}
                    width={500}
                    height={300}
                    layout="responsive"
                    objectFit="contain"
                  />
                ) : (
                  <Flex
                    align="center"
                    justify="center"
                    style={{ height: '300px', border: '2px dashed var(--gray-6)', borderRadius: 'var(--radius-2)' }}
                  >
                    <Text>Drag and drop an image here or use the upload button</Text>
                  </Flex>
                )}
              </Box>
            </Card>
          </Box>
        </Grid>
        </Container>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
    </>
  );
}