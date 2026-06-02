using FluentValidation;
using Frets.Core.DTOs.Users;

namespace Frets.Core.Validators.Users;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        When(x => !string.IsNullOrEmpty(x.Username), () =>
        {
            RuleFor(x => x.Username!)
                .MinimumLength(3).WithMessage("Username must be at least 3 characters.")
                .MaximumLength(30).WithMessage("Username must not exceed 30 characters.")
                .Matches("^[a-zA-Z0-9_]+$")
                .WithMessage("Username can only contain English letters, numbers and underscores.");
        });
    }
}
