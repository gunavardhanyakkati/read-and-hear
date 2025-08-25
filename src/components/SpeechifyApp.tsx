import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Voice {
  name: string;
  lang: string;
  voiceURI: string;
}

const SpeechifyApp = () => {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState('1');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsRef = useRef<string[]>([]);
  const { toast } = useToast();

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      const voiceList = availableVoices.map(voice => ({
        name: voice.name,
        lang: voice.lang,
        voiceURI: voice.voiceURI,
      }));
      setVoices(voiceList);
      
      // Set default voice (prefer English)
      const defaultVoice = availableVoices.find(voice => 
        voice.lang.startsWith('en') && voice.localService
      );
      if (defaultVoice && !selectedVoice) {
        setSelectedVoice(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [selectedVoice]);

  const handlePlay = () => {
    if (!text.trim()) {
      toast({
        title: "No text to read",
        description: "Please enter some text first.",
        variant: "destructive",
      });
      return;
    }

    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Stop any existing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    wordsRef.current = text.split(/\s+/);
    
    // Configure utterance
    utterance.rate = parseFloat(speed);
    utterance.volume = 1;
    utterance.pitch = 1;

    // Set voice
    if (selectedVoice) {
      const voice = voices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        utterance.voice = speechSynthesis.getVoices().find(v => v.voiceURI === voice.voiceURI) || null;
      }
    }

    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentPosition(0);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const words = wordsRef.current;
        const wordIndex = Math.floor(event.charIndex / (text.length / words.length));
        const progressPercent = (wordIndex / words.length) * 100;
        setProgress(progressPercent);
        setCurrentPosition(event.charIndex);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      toast({
        title: "Playback completed",
        description: "Finished reading the text.",
      });
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      toast({
        title: "Playback error",
        description: "An error occurred during playback.",
        variant: "destructive",
      });
    };

    synthRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (isPlaying) {
      speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentPosition(0);
  };

  const speedOptions = [
    { value: '0.5', label: '0.5x' },
    { value: '0.75', label: '0.75x' },
    { value: '1', label: '1x' },
    { value: '1.25', label: '1.25x' },
    { value: '1.5', label: '1.5x' },
    { value: '1.75', label: '1.75x' },
    { value: '2', label: '2x' },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            SpeechifyAI
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Transform any text into natural-sounding speech with AI-powered voices
          </p>
        </div>

        {/* Main Content */}
        <Card className="max-w-4xl mx-auto bg-glass backdrop-blur-glass border-glass shadow-card">
          <div className="p-6 md:p-8">
            {/* Text Input Area */}
            <div className="mb-6">
              <label htmlFor="text-input" className="block text-lg font-medium text-foreground mb-3">
                Enter your text
              </label>
              <Textarea
                id="text-input"
                placeholder="Paste your text here or start typing..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[200px] text-base bg-secondary/50 border-glass resize-none"
                maxLength={5000}
              />
              <div className="mt-2 text-right text-sm text-muted-foreground">
                {text.length}/5000 characters
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Playback Controls */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="lg"
                  onClick={handlePlay}
                  disabled={!text.trim() || isPlaying}
                  className="bg-gradient-primary hover:opacity-90 shadow-glow"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {isPaused ? 'Resume' : 'Play'}
                </Button>
                
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePause}
                  disabled={!isPlaying}
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
                
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center gap-3 md:ml-auto">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <label htmlFor="speed-select" className="text-sm font-medium text-foreground whitespace-nowrap">
                    Speed:
                  </label>
                  <Select value={speed} onValueChange={setSpeed}>
                    <SelectTrigger id="speed-select" className="w-20 bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {speedOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="mb-6">
              <label htmlFor="voice-select" className="block text-sm font-medium text-foreground mb-2">
                Voice
              </label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger id="voice-select" className="bg-secondary/50">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {voices.map((voice) => (
                    <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Progress Bar */}
            {(isPlaying || isPaused || progress > 0) && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </div>
        </Card>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-glass backdrop-blur-glass border-glass p-6 text-center">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Natural Voices</h3>
            <p className="text-muted-foreground text-sm">
              Choose from multiple AI-powered voices for natural-sounding speech
            </p>
          </Card>

          <Card className="bg-glass backdrop-blur-glass border-glass p-6 text-center">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Speed Control</h3>
            <p className="text-muted-foreground text-sm">
              Adjust playback speed from 0.5x to 2x for optimal listening
            </p>
          </Card>

          <Card className="bg-glass backdrop-blur-glass border-glass p-6 text-center">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Full Control</h3>
            <p className="text-muted-foreground text-sm">
              Play, pause, and stop with precise control over your audio
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SpeechifyApp;