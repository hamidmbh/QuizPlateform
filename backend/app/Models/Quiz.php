<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'created_by',
        'duration_minutes',
        'open_at',
        'close_at',
    ];

    protected $casts = [
        'open_at' => 'datetime',
        'close_at' => 'datetime',
    ];

    /**
     * Get the classes that this quiz is assigned to.
     */
    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(ClassModel::class, 'quiz_class', 'quiz_id', 'class_id')
            ->withTimestamps();
    }

    /**
     * Get the user that created the quiz.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the questions for the quiz.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('order');
    }

    /**
     * Get the submissions for the quiz.
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }
}
