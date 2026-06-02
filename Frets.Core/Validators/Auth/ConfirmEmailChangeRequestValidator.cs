using FluentValidation;
using Frets.Core.DTOs.Auth;

namespace Frets.Core.Validators.Auth;

public class ConfirmEmailChangeRequestValidator : AbstractValidator<ConfirmEmailChangeRequest>
{
    public ConfirmEmailChangeRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}
