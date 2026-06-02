using FluentValidation;
using Frets.Core.DTOs.Auth;

namespace Frets.Core.Validators.Auth;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Login).NotEmpty().WithMessage("Email or username is required.");
        RuleFor(x => x.Password).NotEmpty();
    }
}
