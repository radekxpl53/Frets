using Frets.Core.DTOs.Auth;
using FluentValidation;

namespace Frets.Core.Validators.Auth;

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
	public ResetPasswordRequestValidator()
	{
		RuleFor(x => x.Token)
			.NotEmpty().WithMessage("Token is required.");

		RuleFor(x => x.NewPassword).ApplyPasswordRules();
	}
}