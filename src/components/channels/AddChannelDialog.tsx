import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Validation schema for Slack channel input
const slackChannelSchema = z.object({
  channelInput: z.string()
    .min(1, { message: "Channel ID or name is required" })
    .refine(
      (value) => /^(#?[A-Z0-9]+|#[a-zA-Z0-9-]+)$/.test(value), 
      { message: "Invalid Slack channel format" }
    )
});

// Type for channel validation result
type ChannelValidationResult = {
  channelId: string;
  name: string;
  memberCount: number;
  isPrivate: boolean;
  topic?: string;
};

export function AddChannelDialog({ 
  open, 
  onOpenChange, 
  onChannelAdded 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onChannelAdded?: () => void
}) {
  const [validationResult, setValidationResult] = useState<ChannelValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateSlackChannel = useAction(api.slack.validateSlackChannel);
  const addChannelWithValidation = useMutation(api.channels.addChannelWithValidation);

  // React Hook Form setup
  const form = useForm<z.infer<typeof slackChannelSchema>>({
    resolver: zodResolver(slackChannelSchema),
    defaultValues: {
      channelInput: ""
    }
  });

  // Validate channel handler
  const handleValidateChannel = async (channelInput: string) => {
    setIsValidating(true);
    setValidationResult(null);
    setValidationError(null);

    try {
      const result = await validateSlackChannel({ channelId: channelInput.replace('#', '') });
      
      if (result?.valid && result.channelInfo) {
        setValidationResult({
          channelId: result.channelInfo.id,
          name: result.channelInfo.displayName,
          memberCount: result.channelInfo.memberCount || 0,
          isPrivate: result.channelInfo.isPrivate,
          topic: result.channelInfo.topic || result.channelInfo.purpose
        });
        setValidationError(null);
      } else {
        setValidationError(result?.error || "Channel could not be validated. Please check the channel ID or name.");
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsValidating(false);
    }
  };

  // Submit channel handler
  const handleSubmitChannel = async () => {
    if (!validationResult) return;

    setIsSubmitting(true);
    try {
      await addChannelWithValidation({
        slackChannelId: validationResult.channelId,
        channelName: validationResult.name,
        addedBy: 'user'
      });

      // Reset form and close dialog
      form.reset();
      setValidationResult(null);
      setValidationError(null);
      onOpenChange(false);
      
      // Optional callback for parent component
      onChannelAdded?.();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Failed to add channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-primary">Add Slack Channel</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => handleValidateChannel(data.channelInput))}>
            <FormField
              control={form.control}
              name="channelInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel ID or Name</FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="#general or C1234567890" 
                        {...field}
                        disabled={isValidating}
                      />
                      <Button 
                        type="submit" 
                        variant="default" 
                        disabled={isValidating}
                      >
                        {isValidating ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating</>
                        ) : (
                          <>Validate</>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {validationError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {validationResult && (
          <Card className="mt-4 border-primary/30 hover:border-primary/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex justify-between items-center">
                <span>{validationResult.name}</span>
                <Badge 
                  variant={validationResult.isPrivate ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  {validationResult.isPrivate ? 'Private' : 'Public'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members:</span>
                  <span>{validationResult.memberCount}</span>
                </div>
                {validationResult.topic && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Channel Topic:</span>
                    <p className="text-xs italic">{validationResult.topic}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="default" 
            onClick={handleSubmitChannel}
            disabled={!validationResult || isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Channel</>
            ) : (
              <><PlusCircle className="mr-2 h-4 w-4" /> Add Channel</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddChannelDialog;