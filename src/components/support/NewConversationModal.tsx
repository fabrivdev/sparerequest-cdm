import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Package, AlertTriangle, HelpCircle, MessageSquare } from 'lucide-react';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string, initialMessage: string) => void;
}

const subjectOptions = [
  { value: 'Solicitar nuevo producto', icon: Package, color: 'text-blue-500' },
  { value: 'Reportar error', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'Consulta general', icon: HelpCircle, color: 'text-yellow-500' },
  { value: 'Otro', icon: MessageSquare, color: 'text-muted-foreground' },
];

const NewConversationModal = ({ isOpen, onClose, onSubmit }: NewConversationModalProps) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const subject = selectedSubject === 'Otro' ? customSubject : selectedSubject;
    if (!subject.trim() || !message.trim()) return;

    setLoading(true);
    await onSubmit(subject, message);
    setLoading(false);
    
    // Reset form
    setSelectedSubject('');
    setCustomSubject('');
    setMessage('');
  };

  const handleClose = () => {
    setSelectedSubject('');
    setCustomSubject('');
    setMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva conversación de soporte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Selecciona un tema</Label>
            <div className="grid grid-cols-2 gap-2">
              {subjectOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedSubject(option.value)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      selectedSubject === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${option.color}`} />
                    <span className="text-sm">{option.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSubject === 'Otro' && (
            <div>
              <Label htmlFor="custom-subject">Asunto personalizado</Label>
              <input
                id="custom-subject"
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Escribe el asunto..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="message">Mensaje inicial</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe tu consulta o problema..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !message.trim() ||
                !selectedSubject ||
                (selectedSubject === 'Otro' && !customSubject.trim())
              }
            >
              {loading ? 'Enviando...' : 'Iniciar conversación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationModal;
