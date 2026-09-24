import { z as zod } from 'zod';
import { useState } from 'react';
import { m } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { varFade, MotionContainer } from 'src/components/animate';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
import { signInWithPassword } from '../../context/jwt';

// ----------------------------------------------------------------------

export type SignInSchemaType = zod.infer<typeof SignInSchema>;

export const SignInSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const router = useRouter();

  const showPassword = useBoolean();

  const { checkUserSession } = useAuthContext();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultValues: SignInSchemaType = {
    email: '',
    password: '',
  };

  const methods = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signInWithPassword({ email: data.email, password: data.password });
      await checkUserSession?.();

      router.refresh();
    } catch (error) {
      console.error(error);
      const feedbackMessage = getErrorMessage(error);
      setErrorMessage(feedbackMessage);
    }
  });

  // BNW OMS has no self-service password reset yet (needs real SMTP — see docs/PROJECT_GUIDE.md
  // §5), so this doesn't route to a dead `#`/unbuilt page — it tells the person what to actually
  // do right now instead.
  const handleForgotPassword = () => {
    toast.info('Ask an HR/Admin to reset your password for now — self-service reset is coming.');
  };

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <m.div variants={varFade('inUp')}>
        <Field.Text
          name="email"
          label="Email address"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </m.div>

      <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        <m.div variants={varFade('inUp')}>
          <Button
            variant="text"
            size="small"
            onClick={handleForgotPassword}
            sx={{ display: 'block', ml: 'auto' }}
          >
            Forgot password?
          </Button>
        </m.div>

        <m.div variants={varFade('inUp')}>
          <Field.Text
            name="password"
            label="Password"
            placeholder="6+ characters"
            type={showPassword.value ? 'text' : 'password'}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={showPassword.onToggle} edge="end">
                      <Iconify
                        icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                      />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </m.div>
      </Box>

      <m.div variants={varFade('inUp')}>
        <Button
          fullWidth
          color="inherit"
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
          loadingIndicator="Sign in..."
        >
          Sign in
        </Button>
      </m.div>
    </Box>
  );

  return (
    <MotionContainer>
      <m.div variants={varFade('inUp')}>
        <FormHead
          title="Sign in to your account"
          sx={{ textAlign: { xs: 'center', md: 'left' } }}
        />
      </m.div>

      {!!errorMessage && (
        <m.div variants={varFade('inUp')}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        </m.div>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>
    </MotionContainer>
  );
}
